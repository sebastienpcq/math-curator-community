import hashlib,json,pathlib,re,subprocess,zipfile,tempfile,os,sys
REFERENCE="d762095dfbf9c6b716acf6a75d903a1b8f5e79f8"
SOURCE=sys.argv[1] if len(sys.argv)>1 else os.environ.get("GITHUB_SHA","HEAD")
SOURCE=subprocess.check_output(["git","rev-parse",SOURCE],text=True).strip()
FILES=sorted(["manifest.json","popup.html","options.html","src/background.js","src/config.js","src/scoring.js","src/content.js","src/content.css","src/options.js","src/popup.js","src/ui.css"])
OUT=pathlib.Path("release-candidate");OUT.mkdir(exist_ok=True)
payload={p:subprocess.check_output(["git","show",SOURCE+":"+p]) for p in FILES}
for p in FILES:
 original=subprocess.check_output(["git","show",REFERENCE+":"+p])
 if p=="manifest.json":
  expected=json.loads(original);expected["version"]="1.0.1"
  assert json.loads(payload[p])==expected,"Unexpected manifest delta"
 else: assert payload[p]==original,"Unexpected application delta: "+p
m=json.loads(payload["manifest.json"])
assert m["manifest_version"]==3 and m["version"]=="1.0.1"
assert m["permissions"]==["storage"]
refs=[m["action"]["default_popup"],m["options_page"],m["background"]["service_worker"]]
for cs in m["content_scripts"]:
 assert cs["matches"]==["https://www.youtube.com/*"]
 refs+=cs["js"]+cs["css"]
for html in ["popup.html","options.html"]:
 refs+=re.findall(r'(?:src|href)="([^"]+)"',payload[html].decode())
for ref in refs: assert ref in payload,ref
assert b"importScripts('config.js')" in payload["src/background.js"]
def archive(target):
 with zipfile.ZipFile(target,"w",compression=zipfile.ZIP_STORED) as z:
  for p in FILES:
   i=zipfile.ZipInfo(p,(1980,1,1,0,0,0));i.create_system=3;i.external_attr=0o100644<<16
   z.writestr(i,payload[p])
name="math-curator-community-v1.0.1-rc1.zip"
archive(OUT/name)
with tempfile.TemporaryDirectory() as t:
 second=pathlib.Path(t)/"repeat.zip";archive(second)
 assert second.read_bytes()==(OUT/name).read_bytes()
 with zipfile.ZipFile(OUT/name) as z:
  assert z.namelist()==FILES
  for p in z.namelist():
   assert not p.startswith("/") and ".." not in pathlib.PurePosixPath(p).parts
   assert z.read(p)==payload[p]
  z.extractall(OUT/"extracted")
digest=hashlib.sha256((OUT/name).read_bytes()).hexdigest()
(OUT/"SHA256SUMS.txt").write_text(digest+"  "+name+"\n")
manifest={"source":SOURCE,"validated_reference":REFERENCE,"manifest_version":m["version"],"sha256":digest,"method":"ZIP_STORED; sorted paths; fixed 1980 timestamp; Unix 0644; no extra fields","files":[{"path":p,"size":len(payload[p]),"sha256":hashlib.sha256(payload[p]).hexdigest()} for p in FILES],"checks":{"repeat_identical":True,"extracted_equals_source":True,"manifest_resources_exist":True}}
(OUT/"package-manifest.json").write_text(json.dumps(manifest,indent=2)+"\n")
print(json.dumps(manifest,indent=2))

