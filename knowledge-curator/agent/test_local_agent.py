import importlib.util
import json
import pathlib
import unittest

path = pathlib.Path(__file__).with_name("local_agent.py")
spec = importlib.util.spec_from_file_location("local_agent", path)
agent = importlib.util.module_from_spec(spec)
spec.loader.exec_module(agent)

class ValidatorTests(unittest.TestCase):
    def test_valid_edge_case(self):
        proposal = {"function":"append",
                    "scenario":"Ajouter une tentative avec un timestamp valide mais une date future lointaine.",
                    "expected":"La tentative est acceptée selon le contrat actuel, ou le comportement doit être clarifié par un test."}
        result,error=agent.validate_answer(json.dumps(proposal),"attempts.cjs")
        self.assertIsNone(error)
        self.assertEqual(result,proposal)

    def test_unknown_function_rejected(self):
        proposal={"function":"saveAttempt","scenario":"Ajouter une tentative avec des champs valides.",
                  "expected":"La fonction devrait sauvegarder la tentative dans le stockage."}
        self.assertIsNotNone(agent.validate_answer(json.dumps(proposal),"attempts.cjs")[1])

    def test_missing_fields_rejected(self):
        self.assertIsNotNone(agent.validate_answer('{"function":"append"}',"attempts.cjs")[1])

    def test_repetition_rejected(self):
        p={"function":"read","scenario":"Lire une tentative locale enregistrée.",
           "expected":"Lire une tentative locale enregistrée."}
        self.assertIsNotNone(agent.validate_answer(json.dumps(p),"attempts.cjs")[1])

if __name__=="__main__":
    unittest.main()
