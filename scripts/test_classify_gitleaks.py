import importlib.util
import unittest
from pathlib import Path

spec=importlib.util.spec_from_file_location("classifier",Path(__file__).with_name("classify-gitleaks.py"))
module=importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)

class ClassifierTests(unittest.TestCase):
    def test_mismatched_line_still_correlates_storage_constant(self):
        source="const KEY='fictional-storage-id-123456';\nlocalStorage.setItem(KEY,'data');"
        status,reason=module.classify(source,"fictional-storage-id-123456",99)
        self.assertEqual(status,"probable_storage_identifier")
        self.assertIn("content_match",reason)
    def test_sensitive_context_not_exempted(self):
        source="const apiKey='fictional-storage-id-123456';\nlocalStorage.setItem(apiKey,'x');"
        self.assertEqual(module.classify(source,"fictional-storage-id-123456",1)[0],"unverified")
    def test_missing_value_not_exempted(self):
        self.assertEqual(module.classify("const KEY='something';","fictional-storage-id-123456",1)[0],"unverified")
    def test_direct_storage_call(self):
        source="localStorage.getItem('fictional-storage-id-123456');"
        self.assertEqual(module.classify(source,"fictional-storage-id-123456",1)[0],"probable_storage_identifier")
    def test_empty_secret_is_unverified(self):
        self.assertEqual(module.classify("const KEY='x';","",1)[0],"unverified")

if __name__=="__main__":
    unittest.main()
