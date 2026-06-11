#!/usr/bin/env python3
"""
json_to_md.py — Convert a JSON-LD LearningResource file to readable Markdown.

Usage:
    python json_to_md.py input.json output.md
    python json_to_md.py input.json          # prints to stdout
"""

import argparse
import json


# Maps JSON keys to the section heading they belong to.
SECTION_MAP = {
    "Context & Type":        ["@context", "@type", "@id", "url", "identifier"],
    "Descriptive Metadata":  ["name", "description", "abstract", "keywords",
                               "educationalLevel", "inLanguage", "learningResourceType",
                               "timeRequired", "creativeWorkStatus", "accessibilitySummary",
                               "version"],
    "Dates":                 ["dateCreated", "dateModified", "datePublished"],
    "Audience & Prerequisites": ["audience", "competencyRequired", "teaches"],
    "License":               ["license"],
    "Authors":               ["author"],
    "Contributors":          ["contributor"],
    "About (Topics)":        ["about"],
    "Mentions":              ["mentions"],
    "Recorded At":           ["recordedAt"],
}

# Keys whose values are always rendered as plain string lists (not key-value objects).
PLAIN_LIST_KEYS = {"competencyRequired", "teaches", "inLanguage",
                   "learningResourceType", "license"}


def kv(key, value):
    return f"- **`{key}`** {value}"


def render_object(obj, indent="   "):
    """Render a dict as indented bullet key-value pairs."""
    lines = []
    for k, v in obj.items():
        lines.append(f"{indent}- **`{k}`** {v}")
    return lines


def render_typed_list(items):
    """Render a list of typed objects (e.g. authors, mentions)."""
    lines = []
    for i, item in enumerate(items, 1):
        if isinstance(item, dict):
            type_label = item.get("@type", "Item")
            lines.append(f"{i}. **{type_label}**")
            for k, v in item.items():
                if k != "@type":
                    lines.append(f"   - **`{k}`** {v}")
        else:
            lines.append(f"{i}. {item}")
        lines.append("")
    return lines


def render_audience(obj):
    lines = []
    audience_type = obj.get("@type", "Audience")
    lines.append(f"**`audience`** ({audience_type})")
    for k, v in obj.items():
        if k != "@type":
            lines.append(f"- **`{k}`** {v}")
    return lines


def render_conforms_to(obj):
    lines = ["### Conforms To", ""]
    for k, v in obj.items():
        lines.append(kv(k, v))
    return lines


def json_to_md(data):
    lines = []

    # Title
    title = data.get("name", "Learning Resource")
    lines.append(f"# {title}")
    lines.append("")
    lines.append("<!-- JSON-LD Metadata — edit values freely; structure must be preserved for round-trip conversion -->")
    lines.append("")

    for section, keys in SECTION_MAP.items():
        section_lines = []

        for key in keys:
            if key not in data:
                continue
            value = data[key]

            # Special handling per key
            if key == "dct:conformsTo":
                section_lines += render_conforms_to(value)
                section_lines.append("")
                continue

            if key in ("@context", "@type", "@id", "url", "identifier",
                       "name", "description", "abstract", "keywords",
                       "educationalLevel", "timeRequired", "creativeWorkStatus",
                       "accessibilitySummary", "version",
                       "dateCreated", "dateModified", "datePublished"):
                section_lines.append(kv(key, value))
                continue

            if key in PLAIN_LIST_KEYS:
                if isinstance(value, list):
                    if key in ("inLanguage", "learningResourceType", "license"):
                        for v in value:
                            section_lines.append(f"- {v}")
                    else:
                        section_lines.append(f"**`{key}`**")
                        for v in value:
                            section_lines.append(f"- {v}")
                        section_lines.append("")
                else:
                    section_lines.append(kv(key, value))
                continue

            if key == "audience":
                section_lines += render_audience(value)
                section_lines.append("")
                continue

            if isinstance(value, list) and all(isinstance(i, dict) for i in value):
                section_lines += render_typed_list(value)
                continue

            # Fallback
            section_lines.append(kv(key, value))

        # Handle dct:conformsTo separately inside Context & Type
        if section == "Context & Type" and "dct:conformsTo" in data:
            section_lines.append("")
            section_lines += render_conforms_to(data["dct:conformsTo"])

        if section_lines:
            lines.append(f"## {section}")
            lines.append("")
            lines += section_lines
            lines.append("")
            lines.append("---")
            lines.append("")

    return "\n".join(lines).rstrip() + "\n"


def main():
    parser = argparse.ArgumentParser(
        description="Convert a JSON-LD LearningResource file to readable Markdown."
    )
    parser.add_argument("input", help="Input .json file to convert.")
    parser.add_argument(
        "output",
        nargs="?",
        help="Optional output .md path. If omitted, prints to stdout.",
    )
    args = parser.parse_args()

    with open(args.input, encoding="utf-8") as f:
        data = json.load(f)

    md = json_to_md(data)

    if args.output:
        with open(args.output, "w", encoding="utf-8") as f:
            f.write(md)
        print(f"Written to {args.output}")
    else:
        print(md)


if __name__ == "__main__":
    main()
