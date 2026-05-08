#!/usr/bin/env python3
"""
md_to_json.py — Convert a Markdown LearningResource file back to JSON-LD.

Usage:
    python md_to_json.py input.md output.json
    python md_to_json.py input.md          # prints to stdout
"""

import json
import re
import sys


# Maps section headings to the JSON keys they contain, and how to handle them.
SECTION_CONFIG = {
    "context & type": {
        "flat_keys": ["@context", "@type", "@id", "url", "identifier"],
        "subsection": "dct:conformsTo",
    },
    "descriptive metadata": {
        "flat_keys": ["name", "description", "abstract", "keywords",
                      "educationalLevel", "timeRequired", "creativeWorkStatus",
                      "accessibilitySummary", "version"],
        "list_keys": ["inLanguage", "learningResourceType"],
    },
    "dates": {
        "flat_keys": ["dateCreated", "dateModified", "datePublished"],
    },
    "audience & prerequisites": {
        "special": "audience_block",
    },
    "license": {
        "plain_list": "license",
    },
    "authors": {
        "typed_list": "author",
    },
    "contributors": {
        "typed_list": "contributor",
    },
    "about (topics)": {
        "typed_list": "about",
    },
    "mentions": {
        "typed_list": "mentions",
    },
    "recorded at": {
        "typed_list": "recordedAt",
    },
}

KV_RE = re.compile(r"^-\s+\*\*`([^`]+)`\*\*\s+(.+)$")
BOLD_KEY_RE = re.compile(r"^\*\*`([^`]+)`\*\*(?:\s+\(([^)]+)\))?$")
NUMBERED_TYPE_RE = re.compile(r"^\d+\.\s+\*\*([^*]+)\*\*$")
INDENTED_KV_RE = re.compile(r"^\s+-\s+\*\*`([^`]+)`\*\*\s+(.+)$")
PLAIN_BULLET_RE = re.compile(r"^-\s+(.+)$")


def parse_kv_line(line):
    m = KV_RE.match(line)
    if m:
        return m.group(1), m.group(2).strip()
    return None, None


def parse_typed_list_block(lines):
    """Parse numbered list of typed objects."""
    items = []
    current = None
    for line in lines:
        line = line.rstrip()
        if not line:
            continue
        m = NUMBERED_TYPE_RE.match(line)
        if m:
            if current is not None:
                items.append(current)
            current = {"@type": m.group(1).strip()}
            continue
        m = INDENTED_KV_RE.match(line)
        if m and current is not None:
            current[m.group(1)] = m.group(2).strip()
            continue
    if current is not None:
        items.append(current)
    return items


def parse_audience_block(lines):
    """Parse the audience/competencyRequired/teaches block."""
    result = {}
    i = 0
    while i < len(lines):
        line = lines[i].rstrip()
        if not line:
            i += 1
            continue

        # audience header: **`audience`** (Audience)
        m = BOLD_KEY_RE.match(line)
        if m:
            key = m.group(1)
            type_label = m.group(2)  # e.g. "Audience"
            if type_label:
                # Collect sub-keys on following plain bullet lines
                obj = {"@type": type_label}
                i += 1
                while i < len(lines):
                    sub = lines[i].rstrip()
                    if not sub:
                        break
                    km = KV_RE.match(sub)
                    if km:
                        obj[km.group(1)] = km.group(2).strip()
                        i += 1
                    else:
                        break
                result[key] = obj
            else:
                # Plain list key like competencyRequired / teaches
                items = []
                i += 1
                while i < len(lines):
                    sub = lines[i].rstrip()
                    if not sub:
                        break
                    pm = PLAIN_BULLET_RE.match(sub)
                    if pm:
                        items.append(pm.group(1).strip())
                        i += 1
                    else:
                        break
                result[key] = items
            continue
        i += 1
    return result


def split_into_sections(text):
    """Split markdown into {heading: [lines]} dict."""
    sections = {}
    current_heading = None
    current_lines = []
    for line in text.splitlines():
        h2 = re.match(r"^## (.+)$", line)
        if h2:
            if current_heading is not None:
                sections[current_heading.lower().strip()] = current_lines
            current_heading = h2.group(1)
            current_lines = []
        else:
            if current_heading is not None and line.strip() not in ("---", ""):
                current_lines.append(line)
    if current_heading is not None:
        sections[current_heading.lower().strip()] = current_lines
    return sections


def parse_conforms_to(lines):
    """Parse the ### Conforms To subsection."""
    obj = {}
    in_sub = False
    for line in lines:
        if re.match(r"^###\s+Conforms To", line):
            in_sub = True
            continue
        if in_sub:
            k, v = parse_kv_line(line)
            if k:
                obj[k] = v
    return obj if obj else None


def md_to_json(text):
    sections = split_into_sections(text)
    data = {
        "@context": None,
        "@type": None,
    }

    for section_key, config in SECTION_CONFIG.items():
        lines = sections.get(section_key, [])

        # Flat key-value pairs — skip lines inside a ### subsection
        in_subsection = False
        for line in lines:
            if re.match(r"^###", line):
                in_subsection = True
            if in_subsection:
                continue
            k, v = parse_kv_line(line)
            if k and "flat_keys" in config and k in config["flat_keys"]:
                data[k] = v

        # List keys (single-value arrays like inLanguage)
        if "list_keys" in config:
            for lk in config["list_keys"]:
                vals = []
                capture = False
                for line in lines:
                    if re.match(rf"^-\s+\*\*`{re.escape(lk)}`\*\*", line):
                        capture = True
                        # value may be inline on same line after the key
                        m = re.match(rf"^-\s+\*\*`{re.escape(lk)}`\*\*\s+(.+)$", line)
                        if m:
                            vals.append(m.group(1).strip())
                            capture = False
                        continue
                    if capture:
                        pm = PLAIN_BULLET_RE.match(line)
                        if pm:
                            vals.append(pm.group(1).strip())
                        else:
                            capture = False
                # Also handle plain bullet without header (e.g. inLanguage just listed)
                if not vals:
                    for line in lines:
                        k2, v2 = parse_kv_line(line)
                        if k2 == lk:
                            vals.append(v2)
                if vals:
                    data[lk] = vals

        # Conforms To subsection
        if "subsection" in config:
            ct = parse_conforms_to(lines)
            if ct:
                data["dct:conformsTo"] = ct

        # Typed object lists
        if "typed_list" in config:
            items = parse_typed_list_block(lines)
            if items:
                data[config["typed_list"]] = items

        # Plain URL list (license)
        if "plain_list" in config:
            urls = []
            for line in lines:
                pm = PLAIN_BULLET_RE.match(line.strip())
                if pm:
                    urls.append(pm.group(1).strip())
            if urls:
                data[config["plain_list"]] = urls

        # Audience block
        if config.get("special") == "audience_block":
            parsed = parse_audience_block(lines)
            data.update(parsed)

    # Remove None top-level keys
    data = {k: v for k, v in data.items() if v is not None}

    return data


def main():
    if len(sys.argv) < 2:
        print("Usage: python md_to_json.py input.md [output.json]")
        sys.exit(1)

    with open(sys.argv[1], encoding="utf-8") as f:
        text = f.read()

    data = md_to_json(text)
    out = json.dumps(data, indent=2, ensure_ascii=False)

    if len(sys.argv) >= 3:
        with open(sys.argv[2], "w", encoding="utf-8") as f:
            f.write(out + "\n")
        print(f"Written to {sys.argv[2]}")
    else:
        print(out)


if __name__ == "__main__":
    main()
