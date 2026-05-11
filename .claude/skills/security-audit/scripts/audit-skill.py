# @HEADER
# @version 0.6.5 | 2026-04-28
# @purpose Scan a local directory of skills, agents, or scripts for risky patterns so the security-audit skill has a deterministic first-pass helper.
# @sidecar audit-skill.py.header.md
# @layer control-plane | @hex _none_ | @ctx _none_
# @public false
# @edit careful

import json
import os
import re
import sys
from pathlib import Path

PATTERNS = {
    "destructive_shell": [
        r"rm\s+-rf",
        r"git\s+reset\s+--hard",
        r"chmod\s+777",
    ],
    "network_exfil": [
        r"curl\s+.+https?://",
        r"wget\s+.+https?://",
        r"requests\.(post|get)\(",
        r"fetch\(",
    ],
    "unsafe_permissions": [
        r"bypassPermissions",
        r"permissionMode:\s*bypassPermissions",
        r'disabled?AllHooks"\s*:\s*false',
    ],
    "auto_commit": [
        r"git\s+commit\b",
        r"smart-commit",
        r"post-commit",
    ],
}

def scan_file(path: Path):
    text = path.read_text(encoding="utf-8", errors="ignore")
    findings = []
    for category, patterns in PATTERNS.items():
        for pattern in patterns:
            if re.search(pattern, text):
                findings.append({"category": category, "pattern": pattern})
    return findings

def main():
    if len(sys.argv) < 2:
        print("Usage: audit-skill.py <path>", file=sys.stderr)
        sys.exit(2)

    root = Path(sys.argv[1])
    if not root.exists():
        print(json.dumps({"ok": False, "error": f"Path not found: {root}"}))
        sys.exit(1)

    results = []
    for file in root.rglob("*"):
        if not file.is_file():
            continue
        if file.suffix.lower() not in {".md", ".py", ".sh", ".js", ".mjs", ".json", ".yaml", ".yml"}:
            continue
        findings = scan_file(file)
        if findings:
            results.append({"file": str(file), "findings": findings})

    output = {
        "kind": "security-audit",
        "ok": len(results) == 0,
        "findings": results,
    }
    print(json.dumps(output, indent=2))
    sys.exit(0 if output["ok"] else 1)

if __name__ == "__main__":
    main()
