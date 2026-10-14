#!/usr/bin/env python3
"""Agent local V0.5 : propositions courtes, validées, jamais appliquées."""
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
    ("Cas limite de l'historique", "attempts.cjs",
     "Trouver un NOUVEAU cas limite non couvert par les tests. Les cas déjà couverts : trois événements conservés, relecture, stockage invalide, erreur de quota et événement incomplet."),
]
KNOWN_API = {"read", "append", "replace", "validEvent", "validateHistory"}

MAX_SOURCE = 1100

def query_ollama(prompt, model, timeout):
    payload = json.dumps({
        "model": model, "prompt": prompt, "stream": False,
        "format": {"type": "object", "properties": {
            "function": {"type": "string", "enum": sorted(KNOWN_API)},
            "scenario": {"type": "string"},
            "expected": {"type": "string"}
        }, "required": ["function", "scenario", "expected"], "additionalProperties": False},
        "options": {"temperature": 0.1, "num_predict": 350}
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
    if not isinstance(value, dict) or set(value) != {"function", "scenario", "expected"}:
        return None, "Trois champs exacts requis"
    if value.get("function") not in KNOWN_API:
        return None, "Fonction inexistante dans l'API"
    if any(not isinstance(value.get(k), str) or not 15 <= len(value[k].strip()) <= 350 for k in ("scenario","expected")):
        return None, "Scénario ou résultat attendu absent"
    if value["scenario"].strip().casefold() == value["expected"].strip().casefold():
        return None, "Scénario et résultat identiques"
    return value, None

def main():
    parser = argparse.ArgumentParser(description="Knowledge Curator : agent local V0.5")
    parser.add_argument("--model", default="qwen2.5-coder:1.5b")
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
    output = ["# Rapport Ollama — agent V0.5", "",
              "Propositions non vérifiées. Aucun code source n'est modifié.", ""]
    directory = PROJECT / "agent-reports"
    directory.mkdir(exist_ok=True)
    destination = directory / ("proposal-v05-" +
        datetime.datetime.now(datetime.timezone.utc).strftime("%Y%m%d-%H%M%S") + ".md")
    total_accepted = 0
    total_attempts = 0
    try:
        for index in range(args.iterations):
            title, target, task = TASKS[index]
            print(f"[{index + 1}/{args.iterations}] Tests locaux...", flush=True)
            tests = subprocess.run(["node", "--test", "knowledge-curator/tests/attempts.test.cjs"],
                                   cwd=ROOT, text=True, capture_output=True, timeout=45)
            if tests.returncode:
                output.extend(["## Tests en échec", "```", tests.stdout[-1500:],
                               tests.stderr[-1500:], "```"])
                break
            snippet = (PROJECT / target).read_text(encoding="utf-8")[:MAX_SOURCE]
            prompt = (
                "Tu proposes UN nouveau cas limite pour tester une fonction existante. "
                "Réponds en JSON avec exactement trois champs : function, scenario, expected. "
                "function doit être une des valeurs read, append, replace, validEvent, validateHistory. "
                "scenario décrit une entrée concrète, expected le résultat attendu. "
                "N'invente aucune API. Ne recopie pas les tests existants. "
                f"Tâche : {task}\\nCode de référence :\\n{snippet}")
            print(f"[{index + 1}/{args.iterations}] Analyse Ollama : {title}...", flush=True)
            result, error = None, "Aucune tentative"
            output.append(f"## Cycle {index + 1} — {title}")
            for attempt in (1, 2):
                total_attempts += 1
                print(f"  Tentative {attempt}/2...", flush=True)
                candidate_prompt = prompt if attempt == 1 else (
                    "Trois champs JSON uniquement : function, scenario, expected. "
                    "Choisis une fonction existante : read, append, replace, validEvent, validateHistory. "
                    "Propose un cas limite avec entrée et résultat attendu, sans répéter les tests connus.")
                try:
                    raw = query_ollama(candidate_prompt, args.model, args.timeout)
                    result, error = validate_answer(raw, target)
                    if error:
                        # Diagnostic local uniquement. Ne jamais interpréter le texte comme du code.
                        raw_path = directory / (destination.stem + f"-cycle{index+1}-attempt{attempt}.txt")
                        raw_path.write_text(raw[:12000], encoding="utf-8")
                        output.append(f"Tentative {attempt} rejetée : {error}. Réponse brute : {raw_path.name}")
                    else:
                        total_accepted += 1
                        output.append(f"Tentative {attempt} acceptée sur la forme ; revue humaine nécessaire.")
                        break
                except (urllib.error.URLError, TimeoutError, KeyError, ValueError) as exc:
                    result, error = None, f"Erreur Ollama : {type(exc).__name__}"
                    output.append(f"Tentative {attempt} : {error}")
                    if isinstance(exc, urllib.error.URLError):
                        break
            if error:
                output.append("Proposition rejetée : " + error)
            else:
                for key in ("function", "scenario", "expected"):
                    output.append(f"**{key}** : {result[key]}")
            output.append("")
    except KeyboardInterrupt:
        output.extend(["## Interruption", "Arrêt manuel demandé ; aucune modification appliquée."])
        print("Interruption demandée.", flush=True)
    finally:
        output.append(f"\\nBilan : {total_accepted}/{args.iterations} cycles acceptés ; {total_attempts} tentatives.")
        destination.write_text("\n".join(output) + "\n", encoding="utf-8")
        print("Rapport :", destination.relative_to(ROOT), flush=True)
        print("Aucun code modifié et aucun commit publié.", flush=True)

if __name__ == "__main__":
    main()
