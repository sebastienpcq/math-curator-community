#!/usr/bin/env python3
"""Agent local V0.4 : propositions courtes, validées, jamais appliquées."""
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
    ("Test de conservation des tentatives", "attempts.cjs",
     "Proposer un test qui enregistre trois tentatives false, false, true puis les relit. Résultat attendu : trois événements distincts conservés dans le même ordre."),
    ("Erreur de stockage", "attempts.cjs",
     "Proposer un test simulant une erreur de quota localStorage ; résultat attendu : une erreur visible et aucun historique précédent supprimé."),
    ("Validation des événements", "tests/attempts.test.cjs",
     "Proposer un test qui rejette un timestamp invalide ou un exercice sans identifiant, sans écrire dans le stockage."),
]
MAX_SOURCE = 1100

def query_ollama(prompt, model, timeout):
    payload = json.dumps({
        "model": model, "prompt": prompt, "stream": False,
        "format": "json", "options": {"temperature": 0.1, "num_predict": 450}
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
    normalized = [re.sub(r"[^a-z0-9]+", " ", value[k].lower()).strip() for k in ("objective","change","test","risk")]
    if len(set(normalized)) < 4:
        return None, "Champs répétitifs ou identiques"
    tokens = [set(s.split()) for s in normalized]
    for i in range(4):
        for j in range(i+1,4):
            if len(tokens[i] | tokens[j]) and len(tokens[i] & tokens[j]) / len(tokens[i] | tokens[j]) > 0.78:
                return None, "Formulations trop similaires"
    details = ("tentative", "stockage", "localstorage", "exercice", "réponse", "historique", "test", "assert", "validation", "maîtrise", "progression")
    if not any(term in value["change"].lower() for term in details):
        return None, "Changement trop vague ou sans rapport"
    if not any(term in value["test"].lower() for term in ("tester", "vérifier", "assert", "test", "contrôler", "simuler")):
        return None, "Test non vérifiable"
    return value, None

def main():
    parser = argparse.ArgumentParser(description="Knowledge Curator : agent local V0.4")
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
    output = ["# Rapport Ollama — agent V0.4", "",
              "Propositions non vérifiées. Aucun code source n'est modifié.", ""]
    directory = PROJECT / "agent-reports"
    directory.mkdir(exist_ok=True)
    destination = directory / ("proposal-v04-" +
        datetime.datetime.now(datetime.timezone.utc).strftime("%Y%m%d-%H%M%S") + ".md")
    total_accepted = 0
    total_attempts = 0
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
                f"Tâche précise : {task}\nDonne une action concrète et un cas de test avec résultat attendu.\nExtrait du fichier :\n{snippet}")
            print(f"[{index + 1}/{args.iterations}] Analyse Ollama : {title}...", flush=True)
            result, error = None, "Aucune tentative"
            output.append(f"## Cycle {index + 1} — {title}")
            for attempt in (1, 2):
                total_attempts += 1
                print(f"  Tentative {attempt}/2...", flush=True)
                candidate_prompt = prompt if attempt == 1 else (
                    "Réponds UNIQUEMENT par un JSON valide avec cinq chaînes "
                    "objective, file, change, test, risk. "
                    f"file doit être exactement {target}. "
                    "Ne recopie aucun code. Sois précis, chaque champ distinct et non vide. "
                    f"Objectif : {task}")
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
                for key in ("objective", "file", "change", "test", "risk"):
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
