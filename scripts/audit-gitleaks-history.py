#!/usr/bin/env python3
"""Read-only, secret-free history inventory. Never prints matched values or fingerprints."""
import importlib.util
import json
from pathlib import Path
import subprocess
import sys
from collections import Counter

def git(*args, input_data=None):
    return subprocess.run(["git",*args],input=input_data,stdout=subprocess.PIPE,stderr=subprocess.DEVNULL,check=False).stdout

def main(report_path):
    spec=importlib.util.spec_from_file_location("classifier",Path(__file__).with_name("classify-gitleaks.py"))
    module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)
    findings=json.loads(Path(report_path).read_text(encoding="utf-8"))
    values={f.get("Secret") for f in findings if isinstance(f.get("Secret"),str) and f.get("Secret")}
    commits=git("rev-list","--all").decode().splitlines()
    if not commits:
        print(json.dumps({"audit":"incomplete","reason":"no_history"}));return 2
    for value in values:
        paths=set(); hits=0; classifications=set(); examined=0; by_path={}; unverified_reasons=Counter()
        for commit in commits:
            # Git grep prints only filenames into a captured buffer, never stdout.
            proc=subprocess.run(["git","grep","-l","-F","-e",value,commit,"--"],stdout=subprocess.PIPE,stderr=subprocess.DEVNULL,check=False)
            if proc.returncode not in (0,1):
                print(json.dumps({"audit":"incomplete","reason":"git_grep_failed"}));return 2
            examined+=1
            if proc.returncode==1:continue
            for item in proc.stdout.decode("utf-8","replace").splitlines():
                if ":" not in item:continue
                path=item.split(":",1)[1];paths.add(path);hits+=1
                source=git("show",f"{commit}:{path}").decode("utf-8","replace")
                status,reason=module.classify(source,value,None)
                classifications.add(status)
                entry=by_path.setdefault(path,Counter())
                entry[status]+=1
                if status=='unverified':
                    unverified_reasons[reason]+=1
        # Only report aggregate metadata. A heuristic never authorizes an exception.
        for path,counts in sorted(by_path.items()):
            print(json.dumps({"audit":"path_inventory","file":path,"snapshots":sum(counts.values()),"probable_storage":counts.get("probable_storage_identifier",0),"unverified":counts.get("unverified",0),"exception_authorized":False}))
        print(json.dumps({"audit":"unverified_reasons","reasons":dict(sorted(unverified_reasons.items())),"exception_authorized":False}))
        # A heuristic can NEVER authorize an exception.
        print(json.dumps({"audit":"history_inventory","commits_examined":examined,"matching_snapshots":hits,"matching_paths":len(paths),"statuses":sorted(classifications),"exception_authorized":False}))
    fingerprints=[f.get("Fingerprint") for f in findings]
    valid=(len(findings)==5 and len(values)==1 and all(isinstance(x,str) and x for x in fingerprints) and len(set(fingerprints))==5)
    print(json.dumps({"audit":"exception_candidate","findings":len(findings),"distinct_values":len(values),"distinct_fingerprints":len(set(x for x in fingerprints if isinstance(x,str))),"candidate_complete":valid,"activated":False}))
    return 0

if __name__=="__main__":
    sys.exit(main(sys.argv[1]))
