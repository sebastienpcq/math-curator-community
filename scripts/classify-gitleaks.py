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
    if not isinstance(line,int) or line<1 or line>len(lines) or secret not in lines[line-1]:
        return "unverified", "location_not_verified"
    occurrences=[i for i,s in enumerate(lines) if secret in s]
    if any(SENSITIVE.search(lines[i]) for i in occurrences):
        return "unverified", "sensitive_context"
    storage_direct=all(STORAGE_CALL.search(lines[i]) for i in occurrences)
    if storage_direct and occurrences:
        return "probable_storage_identifier", "direct_storage_calls"
    assignments=[]
    for i in occurrences:
        for m in KEY_ASSIGN.finditer(lines[i]):
            if m.group(3)==secret:
                assignments.append(m.group(1))
    if assignments:
        for var in assignments:
            refs=[s for s in lines if re.search(r"\b"+re.escape(var)+r"\b",s)]
            if any(SENSITIVE.search(s) for s in refs):
                return "unverified", "sensitive_variable_use"
            if any(STORAGE_CALL.search(s) for s in refs):
                return "probable_storage_identifier", "constant_used_in_storage"
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
                source=subprocess.check_output(["git","show",f"{commit}:{file_path}"],stderr=subprocess.DEVNULL).decode("utf-8")
                status,reason=classify(source,secret,finding.get("StartLine"))
            except (subprocess.CalledProcessError,UnicodeDecodeError,ValueError):
                pass
        print(json.dumps({"finding":index,"rule":finding.get("RuleID","unknown"),"commit":commit[:12],"status":status,"reason":reason}))

if __name__=="__main__":
    main(sys.argv[1])
