import importlib.util
import pathlib
import unittest

path = pathlib.Path(__file__).with_name("local_agent.py")
spec = importlib.util.spec_from_file_location("local_agent", path)
agent = importlib.util.module_from_spec(spec)
spec.loader.exec_module(agent)

class ValidatorTests(unittest.TestCase):
    def test_repeated_answer_rejected(self):
        repeated = "Le fichier JavaScript sert à créer des exercices et des tests."
        import json
        payload = json.dumps({"objective":repeated,"file":"learning-ui.js","change":repeated,"test":repeated,"risk":repeated})
        result, error = agent.validate_answer(payload, "learning-ui.js")
        self.assertIsNone(result)
        self.assertIsNotNone(error)

    def test_structured_specific_answer_accepted(self):
        import json
        payload=json.dumps({
            "objective":"Conserver un historique local des tentatives sans données personnelles.",
            "file":"learning-ui.js",
            "change":"Après chaque réponse à un exercice, ajouter skillId, correct et timestamp à un historique localStorage.",
            "test":"Vérifier que deux tentatives successives sont conservées et que l'ordre est chronologique.",
            "risk":"Un navigateur en stockage privé peut refuser localStorage et nécessiter une gestion d'erreur."
        })
        result,error=agent.validate_answer(payload,"learning-ui.js")
        self.assertIsNone(error)
        self.assertIsNotNone(result)

    def test_wrong_file_rejected(self):
        import json
        payload=json.dumps({"objective":"Conserver un historique local des réponses.","file":"wrong.js","change":"Ajouter un historique de tentative dans localStorage.","test":"Tester la conservation de deux tentatives.","risk":"Le stockage peut être indisponible."})
        self.assertIsNone(agent.validate_answer(payload,"learning-ui.js")[0])

if __name__ == "__main__":
    unittest.main()
