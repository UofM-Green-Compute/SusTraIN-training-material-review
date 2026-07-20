#!/usr/bin/env python3
"""
md_to_yaml.py - Convert a Markdown LearningResource file to YAML.

Usage:
    python md_to_yaml.py input.md output.yaml
    python md_to_yaml.py input.md           # prints to stdout
    python md_to_yaml.py input_folder
    python md_to_yaml.py input_folder output_folder
"""

import json
import re
import sys
from pathlib import Path

from md_to_json import md_to_json


SAFE_KEY_RE = re.compile(r"^[A-Za-z_][A-Za-z0-9_-]*$")


def yaml_key(key):
    if SAFE_KEY_RE.match(key):
        return key
    return json.dumps(str(key), ensure_ascii=False)


def yaml_scalar(value):
    if value is None:
        return "null"

    if value is True:
        return "true"

    if value is False:
        return "false"

    if isinstance(value, (int, float)) and not isinstance(value, bool):
        return str(value)

    return json.dumps(str(value), ensure_ascii=False)


def yaml_lines(value, indent=0):
    pad = " " * indent

    if isinstance(value, dict):
        lines = []
        for key, item in value.items():
            if isinstance(item, (dict, list)):
                lines.append(f"{pad}{yaml_key(key)}:")
                lines.extend(yaml_lines(item, indent + 2))
            else:
                lines.append(f"{pad}{yaml_key(key)}: {yaml_scalar(item)}")
        return lines

    if isinstance(value, list):
        lines = []
        if not value:
            lines.append(f"{pad}[]")
            return lines

        for item in value:
            if isinstance(item, (dict, list)):
                lines.append(f"{pad}-")
                lines.extend(yaml_lines(item, indent + 2))
            else:
                lines.append(f"{pad}- {yaml_scalar(item)}")
        return lines

    return [f"{pad}{yaml_scalar(value)}"]


def to_yaml_document(data):
    lines = ["---"]
    lines.extend(yaml_lines(data, 0))
    return "\n".join(lines).rstrip() + "\n"


def convert_file(input_path, output_path):
    with open(input_path, encoding="utf-8") as f:
        text = f.read()

    data = md_to_json(text)
    out = to_yaml_document(data)

    output_path.parent.mkdir(parents=True, exist_ok=True)
    with open(output_path, "w", encoding="utf-8") as f:
        f.write(out)


def convert_directory(input_dir, output_dir=None):
    md_files = sorted(
        path for path in input_dir.rglob("*.md") if path.is_file()
    )

    if not md_files:
        print(f"No Markdown files found in {input_dir}")
        return

    converted = 0
    for md_file in md_files:
        relative = md_file.relative_to(input_dir)
        if output_dir is None:
            out_file = md_file.with_suffix(".yaml")
        else:
            out_file = output_dir / relative.with_suffix(".yaml")

        convert_file(md_file, out_file)
        converted += 1
        print(f"Written to {out_file}")

    print(f"Converted {converted} Markdown file(s).")


def main():
    if len(sys.argv) < 2:
        print("Usage: python md_to_yaml.py input.md [output.yaml]")
        print("   or: python md_to_yaml.py input_folder [output_folder]")
        sys.exit(1)

    input_path = Path(sys.argv[1])

    if input_path.is_dir():
        output_dir = Path(sys.argv[2]) if len(sys.argv) >= 3 else None
        convert_directory(input_path, output_dir)
        return

    if not input_path.exists() or not input_path.is_file():
        print(f"Input path does not exist or is not a file: {input_path}")
        sys.exit(1)

    if len(sys.argv) >= 3:
        output_path = Path(sys.argv[2])
        convert_file(input_path, output_path)
        print(f"Written to {output_path}")
        return

    with open(input_path, encoding="utf-8") as f:
        text = f.read()

    data = md_to_json(text)
    out = to_yaml_document(data)
    print(out, end="")


if __name__ == "__main__":
    main()
