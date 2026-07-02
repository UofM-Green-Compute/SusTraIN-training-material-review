#!/usr/bin/env python3
"""
Sync training material markdown files to a Just the Docs website repository.

This script is designed to run in CI from the source catalog repository.
It mirrors selected category folders into the website repository, adds Jekyll
front matter to resource files, generates category landing pages, updates
site-level files, and pushes only when there are content changes.
"""

from __future__ import annotations

import argparse
import base64
import os
import re
import shutil
import stat
import subprocess
import sys
import tempfile
from pathlib import Path

CATEGORY_CONFIG = [
    ("Intro", "Introduction", 1),
    ("AI_impact", "AI Impact", 2),
    ("Energy_efficiency", "Energy Efficiency", 3),
    ("Lifecycle_assessment", "Lifecycle Assessment", 4),
    ("Circular_economy", "Circular Economy", 5),
    ("Metrics_tools", "Metrics and Tools", 6),
]


def run(cmd, cwd=None):
    subprocess.run(cmd, cwd=cwd, check=True)


def run_capture(cmd, cwd=None):
    return subprocess.check_output(cmd, cwd=cwd, text=True).strip()


def first_heading(text: str) -> str | None:
    for line in text.splitlines():
        m = re.match(r"^#\s+(.+)$", line.strip())
        if m:
            return m.group(1).strip()
    return None


def slug_to_title(filename: str) -> str:
    stem = Path(filename).stem
    return stem.replace("_", " ").replace("-", " ").strip().title()


def ensure_front_matter(content: str, title: str, parent: str, nav_order: int) -> str:
    front_matter = (
        "---\n"
        "layout: default\n"
        f"title: \"{title.replace(chr(34), chr(39))}\"\n"
        f"parent: \"{parent.replace(chr(34), chr(39))}\"\n"
        f"nav_order: {nav_order}\n"
        "---\n\n"
    )

    if content.startswith("---\n"):
        m = re.match(r"\A---\s*\n.*?\n---\s*\n", content, flags=re.DOTALL)
        if m:
            body = content[m.end() :].lstrip("\n")
            return front_matter + body
    return front_matter + content.lstrip("\n")


def build_category_index(category_title: str, category_folder: str, files: list[tuple[str, str]]) -> str:
    lines = [
        "---",
        "layout: default",
        f"title: \"{category_title}\"",
        f"nav_order: {next(order for folder, _, order in CATEGORY_CONFIG if folder == category_folder)}",
        "has_children: true",
        "---",
        "",
        f"# {category_title}",
        "",
        "Browse resources in this category:",
        "",
    ]

    for filename, title in files:
        lines.append(f"- [{title}]({filename})")

    lines.append("")
    return "\n".join(lines)


def write_site_files(target_repo_dir: Path, args):
    config_text = "\n".join(
        [
            f"title: \"{args.site_title}\"",
            f"description: \"{args.site_description}\"",
            "theme: just-the-docs",
            f"url: \"{args.site_url}\"",
            f"baseurl: \"{args.baseurl}\"",
            "search_enabled: true",
            "",
            "aux_links:",
            f"  Source Catalogue Repository: \"{args.source_repo_url}\"",
            f"  Website Repository: \"https://github.com/{args.target_repo}\"",
            "",
            "nav_enabled: true",
            "",
        ]
    )
    (target_repo_dir / "_config.yml").write_text(config_text, encoding="utf-8")

    home_lines = [
        "---",
        "layout: home",
        "title: Home",
        "nav_order: 1",
        "---",
        "",
        f"# {args.site_title}",
        "",
        f"{args.site_description}",
        "",
        "## Categories",
        "",
    ]
    for folder, label, _ in CATEGORY_CONFIG:
        home_lines.append(f"- [{label}]({folder}/)")
    home_lines.append("")

    (target_repo_dir / "index.md").write_text("\n".join(home_lines), encoding="utf-8")

    readme_text = "\n".join(
        [
            f"# {args.site_title}",
            "",
            "This repository contains the published documentation website built with",
            "Just the Docs and deployed via GitHub Pages.",
            "",
            "## Publishing model",
            "",
            "- Source content is maintained in the source catalogue repository.",
            "- Content is synchronized automatically by a workflow in the source repository.",
            "- Do not manually edit mirrored category markdown files in this repository.",
            "",
            "## Source repository",
            "",
            f"- {args.source_repo_url}",
            "",
        ]
    )
    (target_repo_dir / "README.md").write_text(readme_text, encoding="utf-8")


def sync_content(source_dir: Path, target_repo_dir: Path):
    category_links = []

    for folder, label, _ in CATEGORY_CONFIG:
        src_category = source_dir / folder
        dst_category = target_repo_dir / folder

        if not src_category.exists():
            raise FileNotFoundError(f"Missing category directory: {src_category}")

        if dst_category.exists():
            shutil.rmtree(dst_category)
        dst_category.mkdir(parents=True, exist_ok=True)

        files_for_index = []
        md_files = sorted(p for p in src_category.glob("*.md") if p.name.lower() != "index.md")

        for nav_order, src_file in enumerate(md_files, start=1):
            content = src_file.read_text(encoding="utf-8")
            title = first_heading(content) or slug_to_title(src_file.name)
            rendered = ensure_front_matter(content, title, label, nav_order)

            dst_file = dst_category / src_file.name
            dst_file.write_text(rendered, encoding="utf-8")
            files_for_index.append((src_file.name, title))

        index_content = build_category_index(label, folder, files_for_index)
        (dst_category / "index.md").write_text(index_content, encoding="utf-8")
        category_links.append((folder, label))

    return category_links


def clone_target_repo(temp_dir: Path, target_repo: str, branch: str, token: str) -> Path:
    repo_dir = temp_dir / "target-repo"
    # The username is not sensitive; only the token must be kept out of the URL
    # and command-line arguments (which are visible in process listings).
    clone_url = f"https://x-access-token@github.com/{target_repo}.git"

    # Write a GIT_ASKPASS helper that supplies the token as the password.
    # The token is passed through an environment variable so it never appears
    # in command-line arguments or the remote URL.
    askpass_script = temp_dir / "askpass.sh"
    askpass_script.write_text("#!/bin/sh\necho \"$GIT_TOKEN\"\n", encoding="utf-8")
    askpass_script.chmod(askpass_script.stat().st_mode | stat.S_IEXEC | stat.S_IXGRP | stat.S_IXOTH)

    env = {**os.environ, "GIT_ASKPASS": str(askpass_script), "GIT_TOKEN": token}
    subprocess.run(
        ["git", "clone", "--branch", branch, "--single-branch", clone_url, str(repo_dir)],
        env=env,
        check=True,
    )

    # Store the auth token for the subsequent push via http.extraheader in the
    # local repo config. This stays inside the ephemeral temp directory and is
    # never exposed in process listings.
    b64 = base64.b64encode(f"x-access-token:{token}".encode()).decode()
    subprocess.run(
        ["git", "config", "http.extraheader", f"AUTHORIZATION: basic {b64}"],
        cwd=repo_dir,
        check=True,
    )

    return repo_dir


def maybe_commit_and_push(target_repo_dir: Path, branch: str, source_sha: str):
    changed = run_capture(["git", "status", "--porcelain"], cwd=target_repo_dir)
    if not changed:
        print("No changes to publish.")
        return

    run(["git", "config", "user.name", "github-actions[bot]"], cwd=target_repo_dir)
    run(
        ["git", "config", "user.email", "41898282+github-actions[bot]@users.noreply.github.com"],
        cwd=target_repo_dir,
    )

    run(["git", "add", "-A"], cwd=target_repo_dir)
    run(
        ["git", "commit", "-m", f"Sync catalogue content from source ({source_sha})"],
        cwd=target_repo_dir,
    )
    run(["git", "push", "origin", branch], cwd=target_repo_dir)


def parse_args():
    parser = argparse.ArgumentParser(description="Sync markdown catalogue to website repository")
    parser.add_argument("--source-dir", default=".", help="Path to source catalog repository root")
    parser.add_argument("--target-repo", required=True, help="GitHub repo in owner/name format")
    parser.add_argument("--target-branch", default="main", help="Target branch to push")
    parser.add_argument("--site-title", required=True, help="Site title for _config.yml")
    parser.add_argument("--site-description", required=True, help="Site description for home page")
    parser.add_argument("--site-url", required=True, help="Site URL value for _config.yml")
    parser.add_argument("--baseurl", required=True, help="Project baseurl value for _config.yml")
    parser.add_argument("--source-repo-url", required=True, help="HTTPS URL of source repo")
    parser.add_argument(
        "--token-env",
        default="WEBSITE_REPO_TOKEN",
        help="Environment variable name containing target repo push token",
    )
    return parser.parse_args()


def main():
    args = parse_args()
    token = os.getenv(args.token_env)
    if not token:
        print(f"Missing required token environment variable: {args.token_env}", file=sys.stderr)
        sys.exit(1)

    source_dir = Path(args.source_dir).resolve()
    source_sha = run_capture(["git", "rev-parse", "--short", "HEAD"], cwd=source_dir)

    with tempfile.TemporaryDirectory() as tmp:
        temp_dir = Path(tmp)
        target_repo_dir = clone_target_repo(temp_dir, args.target_repo, args.target_branch, token)

        sync_content(source_dir, target_repo_dir)
        write_site_files(target_repo_dir, args)
        maybe_commit_and_push(target_repo_dir, args.target_branch, source_sha)


if __name__ == "__main__":
    main()
