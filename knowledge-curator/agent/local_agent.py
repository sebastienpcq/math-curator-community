#!/usr/bin/env python3
"""Local, bounded, review-first Ollama planning agent. Standard library only."""
import argparse
import datetime
import json
import pathlib
import subprocess
import sys
import urllib.error
import urllib.request

ROOT = pathlib.Path(__file__).resolve().parents[2]
PROJECT = ROOT / "knowledge-curator"
ALLOWED = ["ROADMAP.md", "learning.cjs", "learning-ui.js", "learning.json",
           "tests/learning.test.cjs"]
MAX_BYTES = 50000

def ollama(prompt, model, url):
    data = json.dumps({"model": model, "prompt": prompt, "stream": False,
                       "options": {"temperature": 0.2, "num_predict": 1200}}).encode()
    req = urllib.request.Request(url.rstrip("/") + "/api/generate", data=data,
                                 headers={"Content-Type": "application/json"}, method="POST")
    with urllib.request.urlopen(req, timeout=180) as response:
        result = json.load(response)
    return result["response"]

def main():
    p = argparse.ArgumentParser(description="Agent de planification local Knowledge Curator")
    p.add_argument("--model", default="qwen2.5-coder:3b")
    p.add_argument("--url", default="http://127.0.0.1:11434")
    p.add_argument("--iterations", type=int, default=1)
    args = p.parse_args()
    if not 1 <= args.iterations <= 5:
        p.error("iterations doit être compris entre 1 et 5")
    if args.url != "http://127.0.0.1:11434":
        p.error("Connexion limitée à Ollama local sur 127.0.0.1:11434")
    if not (ROOT / ".git").is_dir():
        sys.exit("Exécuter depuis un clone Git local.")
    if subprocess.run(["git", "status", "--porcelain"], cwd=ROOT,
                      capture_output=True, text=True, check=True).stdout.strip():
        sys.exit("Répertoire Git modifié : sauvegarder ou committer les changements avant de lancer l'agent.")
    documents = []
    for name in ALLOWED:
        content = (PROJECT / name).read_text(encoding="utf-8")
        documents.append(f"### {name}\n{content[:MAX_BYTES]}")
    context = "\n\n".join(documents)
    outdir = PROJECT / "agent-reports"
    outdir.mkdir(exist_ok=True)
    report = outdir / ("proposal-" + datetime.datetime.now(datetime.timezone.utc).strftime("%Y%m%d-%H%M%S") + ".md")
    previous = ""
    parts = ["# Propositions locales pour Knowledge Curator", "", "Ces propositions ne sont pas du code vérifié et ne sont jamais appliquées automatiquement."]
    for i in range(1, args.iterations + 1):
        check = subprocess.run(["node", "--test", "knowledge-curator/tests/learning.test.cjs"],
                               cwd=ROOT, text=True, capture_output=True, timeout=90)
        if check.returncode != 0:
            parts.extend([f"## Cycle {i}: tests en échec", "```", check.stdout[-4000:], check.stderr[-2000:], "```"])
            break
        prompt = (
            "Tu es un assistant de développement. Réponds en français. "
            "Propose UNE amélioration limitée pour Knowledge Curator V0.4. "
            "Réponds en Markdown avec : objectif, fichiers concernés, changements précis, tests à ajouter, risques. "
            "Ne prétends pas avoir modifié le code ni exécuté les tests. "
            "Aucune commande destructive, aucun secret et aucune API payante. "
            "N'écris pas de code à exécuter automatiquement.\n"
            "Contexte du projet :\n" + context + "\nPropositions précédentes à éviter :\n" + previous[-2500:]
        )
        try:
            answer = ollama(prompt, args.model, args.url)
        except (urllib.error.URLError, TimeoutError, KeyError, json.JSONDecodeError) as error:
            parts.append(f"## Cycle {i} : échec de la génération locale ({type(error).__name__})")
            break
        parts.extend([f"## Cycle {i} — proposition", "", answer.strip(), ""])
        previous += "\n" + answer
    report.write_text("\n".join(parts) + "\n", encoding="utf-8")
    print(f"Rapport créé : {report.relative_to(ROOT)}")
    print("Aucun fichier source modifié ; aucune modification Git envoyée.")

if __name__ == "__main__":
    main()
