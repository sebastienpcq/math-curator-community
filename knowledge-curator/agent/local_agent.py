#!/usr/bin/env python3
"""Agent local V0.2 : propositions courtes, validées, jamais appliquées."""
import argparse
import datetime
import json
import pathlib
import re
import subprocess
import sys
import urllib.error
import urllib.request

ROOT = pathlib.Path(__file__).resolve().parents[2]
PROJECT = ROOT / "knowledge-curator"
TASKS = [
    ("Historique des tentatives", "learning-ui.js",
     "Proposer un historique local minimal des réponses aux exercices, sans identifiants personnels."),
    ("Validation des acquis", "learning.cjs",
     "Proposer un critère de maîtrise sur plusieurs exercices distincts, sans changer le code."),
    ("Tests de progression", "tests/learning.test.cjs",
     "Proposer deux tests supplémentaires utiles pour détecter une régression."),
]
MAX_SOURCE = 2800

def query_ollama(prompt, model, timeout):
    payload = json.dumps({
        "model": model, "prompt": prompt, "stream": False,
        "format": "json", "options": {"temperature": 0.1, "num_predict": 350}
    }).encode("utf-8")
    request = urllib.request.Request(
        "http://127.0.0.1:11434/api/generate", data=payload,
        headers={"Content-Type": "application/json"}, method="POST")
    with urllib.request.urlopen(request, timeout=timeout) as response:
        return json.load(response)["response"]

def validate_answer(raw, target):
    try:
        value = json.loads(raw)
    except (ValueError, TypeError):
        return None, "JSON invalide"
    if not isinstance(value, dict):
        return None, "Objet JSON attendu"
    keys = ("objective", "file", "change", "test", "risk")
    if any(not isinstance(value.get(k), str) or not 12 <= len(value[k].strip()) <= 500 for k in keys):
        return None, "Champs manquants, trop courts ou trop longs"
    if value["file"].strip() != target:
        return None, "Fichier proposé différent du fichier demandé"
    if any(marker in value["change"] for marker in ("```", "function ", "const ", "git reset", "rm -rf")):
        return None, "Proposition contenant du code ou une commande non attendue"
    return value, None

def main():
    parser = argparse.ArgumentParser(description="Knowledge Curator : agent local V0.2")
    parser.add_argument("--model", default="qwen2.5-coder:0.5b")
    parser.add_argument("--iterations", type=int, default=1)
    parser.add_argument("--timeout", type=int, default=90)
    args = parser.parse_args()
    if not 1 <= args.iterations <= 3:
        parser.error("Nombre de cycles autorisé : 1 à 3")
    if not 15 <= args.timeout <= 180:
        parser.error("Timeout autorisé : 15 à 180 secondes")
    if not (ROOT / ".git").is_dir():
        sys.exit("Dépôt Git introuvable")
    if subprocess.run(["git", "status", "--porcelain"], cwd=ROOT,
                      capture_output=True, text=True, check=True).stdout.strip():
        sys.exit("Dépôt modifié : sauvegarder ou déplacer les fichiers non suivis.")
    output = ["# Rapport Ollama — agent V0.2", "",
              "Propositions non vérifiées. Aucun code source n'est modifié.", ""]
    directory = PROJECT / "agent-reports"
    directory.mkdir(exist_ok=True)
    destination = directory / ("proposal-v02-" +
        datetime.datetime.now(datetime.timezone.utc).strftime("%Y%m%d-%H%M%S") + ".md")
    try:
        for index in range(args.iterations):
            title, target, task = TASKS[index]
            print(f"[{index + 1}/{args.iterations}] Tests locaux...", flush=True)
            tests = subprocess.run(["node", "--test", "knowledge-curator/tests/learning.test.cjs"],
                                   cwd=ROOT, text=True, capture_output=True, timeout=45)
            if tests.returncode:
                output.extend(["## Tests en échec", "```", tests.stdout[-1500:],
                               tests.stderr[-1500:], "```"])
                break
            snippet = (PROJECT / target).read_text(encoding="utf-8")[:MAX_SOURCE]
            prompt = (
                "Tu analyses UN fichier JavaScript de Knowledge Curator. "
                "Ne recopie jamais le fichier, ne propose ni code ni commandes. "
                "Propose une amélioration précise et modeste. "
                "Réponds UNIQUEMENT avec un objet JSON contenant cinq chaînes : "
                "objective, file, change, test, risk. "
                "Chaque champ doit faire entre 12 et 500 caractères. "
                f"Le champ file doit être exactement {target}. "
                f"Tâche : {task}\nExtrait du fichier (peut être tronqué) :\n{snippet}")
            print(f"[{index + 1}/{args.iterations}] Analyse Ollama : {title}...", flush=True)
            try:
                raw = query_ollama(prompt, args.model, args.timeout)
                result, error = validate_answer(raw, target)
            except (urllib.error.URLError, TimeoutError, KeyError, ValueError) as exc:
                result, error = None, f"Erreur Ollama : {type(exc).__name__}"
            output.append(f"## Cycle {index + 1} — {title}")
            if error:
                output.append("Proposition rejetée : " + error)
            else:
                for key in ("objective", "file", "change", "test", "risk"):
                    output.append(f"**{key}** : {result[key]}")
            output.append("")
    except KeyboardInterrupt:
        output.extend(["## Interruption", "Arrêt manuel demandé ; aucune modification appliquée."])
        print("Interruption demandée.", flush=True)
    finally:
        destination.write_text("\n".join(output) + "\n", encoding="utf-8")
        print("Rapport :", destination.relative_to(ROOT), flush=True)
        print("Aucun code modifié et aucun commit publié.", flush=True)

if __name__ == "__main__":
    main()
