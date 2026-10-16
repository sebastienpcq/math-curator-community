#!/usr/bin/env python3
"""Classify Gitleaks findings without printing matched values or source lines."""
import json
import re
import subprocess
import sys

STORAGE_CALL = re.compile(r"\b(?:localStorage|sessionStorage)\s*\.\s*(?:getItem|setItem|removeItem)\s*\(")
KEY_ASSIGN = re.compile(r"\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*(['\x22\x60])([^'\x22\x60]+)\2")
SENSITIVE = re.compile(r"\b(?:fetch|Authorization|Bearer|apiKey|api_key|password|token|secret|credential)\b", re.I)
def classify(source, secret, line):
    lines=source.splitlines()
    if not isinstance(secret,str) or not secret:
        return "unverified", "missing_secret"
    occurrences=[i for i,s in enumerate(lines) if secret in s]
    if not occurrences:
        return "unverified", "value_not_in_snapshot"
    if not isinstance(line,int) or line<1 or line>len(lines) or secret not in lines[line-1]:
        location_note="content_match_without_line_match"
    else:
        location_note="line_and_content_match"
    if any(SENSITIVE.search(lines[i]) for i in occurrences):
        return "unverified", "sensitive_context"
    storage_direct=all(STORAGE_CALL.search(lines[i]) for i in occurrences)
    if storage_direct and occurrences:
        return "probable_storage_identifier", "direct_storage_calls_"+location_note
    assignments=[]
    for i in occurrences:
        for m in KEY_ASSIGN.finditer(lines[i]):
            if m.group(3)==secret:
                assignments.append(m.group(1))
    if not assignments:
        # A literal may be passed directly to storage.setItem, or appear in a
        # comparison inside a test; never promote it without positive evidence.
        if any(re.search(r"\b(?:localStorage|sessionStorage)\s*\.\s*(?:getItem|setItem|removeItem)\s*\([^)]*"+re.escape(secret),lines[i]) for i in occurrences):
            return "probable_storage_identifier", "storage_literal_argument_"+location_note
    if assignments:
        for var in assignments:
            refs=[s for s in lines if re.search(r"\b"+re.escape(var)+r"\b",s)]
            if any(SENSITIVE.search(s) for s in refs):
                return "unverified", "sensitive_variable_use"
            if any(STORAGE_CALL.search(s) or re.search(r"\bstorage\s*\.\s*(?:getItem|setItem|removeItem)\s*\(",s) for s in refs):
                return "probable_storage_identifier", "constant_used_in_storage_"+location_note
        return "unverified", "constant_without_proven_storage_use"
    return "unverified", "insufficient_context"

def main(path):
    with open(path,encoding="utf-8") as f: findings=json.load(f)
    for index,finding in enumerate(findings,1):
        commit=finding.get("Commit","")
        file_path=finding.get("File","")
        secret=finding.get("Secret","")
        status,reason="unverified","unavailable_history"
        if commit and file_path and secret:
            try:
                patch=subprocess.check_output(
                    ["git","show","--format=","--no-ext-diff","--unified=0",commit,"--",file_path],
                    stderr=subprocess.DEVNULL
                ).decode("utf-8")
                changed=[line[1:] for line in patch.splitlines() if line.startswith(("+","-")) and not line.startswith(("+++","---"))]
                in_diff=any(secret in line for line in changed)
                if not in_diff:
                    status,reason="unverified","not_found_in_commit_diff"
                else:
                    source=subprocess.check_output(["git","show",f"{commit}:{file_path}"],stderr=subprocess.DEVNULL).decode("utf-8")
                    status,reason=classify(source,secret,finding.get("StartLine"))
                    if reason=="value_not_in_snapshot":
                        parent=subprocess.check_output(["git","rev-parse",commit+"^"],stderr=subprocess.DEVNULL).decode().strip()
                        previous=subprocess.check_output(["git","show",f"{parent}:{file_path}"],stderr=subprocess.DEVNULL).decode("utf-8")
                        status,reason=classify(previous,secret,None)
                        reason="parent_"+reason
            except (subprocess.CalledProcessError,UnicodeDecodeError,ValueError):
                pass
        print(json.dumps({"finding":index,"rule":finding.get("RuleID","unknown"),"commit":commit[:12],"status":status,"reason":reason}))

if __name__=="__main__":
    main(sys.argv[1])
