#!/usr/bin/env python3
"""Create an ephemeral, exact-fingerprint candidate allowlist; never print its contents."""
import json
from pathlib import Path
import subprocess
import sys

EXPECTED={
 ("4a0fff15d734","knowledge-curator/attempts.cjs"),
 ("149bdd12227d","knowledge-curator/tests/browser.spec.cjs"),
 ("4d5e863a93c6","knowledge-curator/tests/browser.spec.cjs"),
 ("602e38bb00b9","knowledge-curator/tests/browser.spec.cjs"),
 ("be3cacc01a79","knowledge-curator/tests/browser.spec.cjs"),
}
def verify(report, source):
    rows=json.loads(Path(report).read_text(encoding="utf-8"))
    lines=source.splitlines()
    keys=[line.split("=",1)[1].strip().rstrip(";").strip(chr(39)+chr(34)) for line in lines if line.strip().startswith("const KEY=")]
    fps=[x.get("Fingerprint") for x in rows]
    valid=(len(rows)==5 and len(keys)==1 and
           {(str(x.get("Commit",""))[:12],x.get("File")) for x in rows}==EXPECTED and
           all(x.get("RuleID")=="generic-api-key" and x.get("Secret")==keys[0] for x in rows) and
           all(isinstance(x,str) and x and "\n" not in x and "\r" not in x for x in fps) and
           len(set(fps))==5)
    return valid,fps
def main(report,destination):
    source=subprocess.run(["git","show","4a0fff15d734:knowledge-curator/attempts.cjs"],capture_output=True,check=False)
    if source.returncode:
        print(json.dumps({"audit":"dry_run_allowlist","prepared":False,"reason":"history_unavailable"}));return 2
    valid,fps=verify(report,source.stdout.decode("utf-8","replace"))
    if not valid:
        print(json.dumps({"audit":"dry_run_allowlist","prepared":False,"reason":"evidence_mismatch"}));return 2
    path=Path(destination)
    path.write_text("\n".join(fps)+"\n",encoding="utf-8")
    path.chmod(0o600)
    print(json.dumps({"audit":"dry_run_allowlist","prepared":True,"fingerprints":len(fps),"committed":False}))
    return 0
if __name__=="__main__":
    sys.exit(main(sys.argv[1],sys.argv[2]))
