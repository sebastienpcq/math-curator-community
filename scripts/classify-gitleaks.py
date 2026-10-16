#!/usr/bin/env python3
"""Print only safe, aggregate metadata about Gitleaks findings."""
import collections
import json
import subprocess
import sys

def main(path):
    with open(path, encoding="utf-8") as handle:
        findings = json.load(handle)
    results = collections.Counter()
    for finding in findings:
        file_path = finding.get("File", "")
        commit = finding.get("Commit", "")
        secret = finding.get("Secret", "")
        line = finding.get("StartLine")
        classification = "unverified"
        if file_path in ("knowledge-curator/attempts.cjs", "knowledge-curator/tests/browser.spec.cjs") and commit and isinstance(line, int) and secret:
            try:
                source = subprocess.check_output(
                    ["git", "show", f"{commit}:{file_path}"],
                    stderr=subprocess.DEVNULL,
                ).decode("utf-8")
                lines = source.splitlines()
                matched = lines[line - 1] if 0 < line <= len(lines) else ""
                markers = ("localStorage.", "getItem(", "setItem(", "removeItem(", "const KEY=", "attemptsKey=", "progressKey=")
                if secret in matched and any(marker in matched for marker in markers):
                    classification = "storage-key-candidate"
            except (subprocess.CalledProcessError, UnicodeDecodeError):
                pass
        results[(finding.get("RuleID", "unknown"), classification)] += 1
    for (rule, classification), count in sorted(results.items()):
        print(json.dumps({"rule": rule, "classification": classification, "count": count}))

if __name__ == "__main__":
    main(sys.argv[1])
