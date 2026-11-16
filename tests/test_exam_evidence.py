"""Provenance gates reject unsupported or rewritten teacher quotations."""
from pathlib import Path
import copy
import sys
import unittest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from exam_evidence import validate_teacher_evidence


class TeacherEvidenceTests(unittest.TestCase):
    def setUp(self):
        self.sources = {'rec-s1': {'excerpt': '先看数据流。 Why\n  do we need two controls?\t请同学回答。'}}
        self.entry = {
            'id': 'control-question', 'category': 'teacher', 'sourceIds': ['rec-s1'],
            'teacherEvidence': [{'kind': 'question', 'sourceId': 'rec-s1',
                                 'quote': 'Why do we need two controls?'}],
        }

    def test_accepts_exact_quote_with_whitespace_normalization(self):
        self.assertEqual(validate_teacher_evidence(self.entry, self.sources), 1)

    def test_explicit_preparation_keeps_question_evidence(self):
        self.entry['category'] = 'explicit'
        self.assertEqual(validate_teacher_evidence(self.entry, self.sources), 1)

    def test_regular_entries_do_not_require_teacher_evidence(self):
        for category in ('explicit', 'class', 'practice', 'scope'):
            with self.subTest(category=category):
                self.assertEqual(validate_teacher_evidence({'id': 'ordinary', 'category': category}, self.sources), 0)

    def test_teacher_requires_evidence(self):
        del self.entry['teacherEvidence']
        with self.assertRaisesRegex(ValueError, 'requires teacherEvidence'):
            validate_teacher_evidence(self.entry, self.sources)

    def test_rejects_unattributed_or_rewritten_evidence(self):
        cases = [
            ('kind', 'important', 'kind must'),
            ('sourceId', 'missing-source', 'unknown sourceId'),
            ('quote', '', 'nonempty text'),
            ('quote', ' \n\t ', 'nonempty text'),
            ('quote', 'Why do we need three controls?', 'not a whitespace-normalized substring'),
            ('quote', 'Why … two controls?', 'not a whitespace-normalized substring'),
        ]
        for field, value, message in cases:
            with self.subTest(field=field, value=value):
                entry = copy.deepcopy(self.entry)
                entry['teacherEvidence'][0][field] = value
                with self.assertRaisesRegex(ValueError, message):
                    validate_teacher_evidence(entry, self.sources)

    def test_source_must_be_in_the_entry_source_list(self):
        self.entry['sourceIds'] = []
        with self.assertRaisesRegex(ValueError, 'entry.sourceIds'):
            validate_teacher_evidence(self.entry, self.sources)

    def test_rejects_malformed_evidence_and_empty_sources(self):
        self.entry['teacherEvidence'] = 'not a list'
        with self.assertRaisesRegex(ValueError, 'must be a list'):
            validate_teacher_evidence(self.entry, self.sources)
        self.entry['teacherEvidence'] = [None]
        with self.assertRaisesRegex(ValueError, 'must be an object'):
            validate_teacher_evidence(self.entry, self.sources)
        self.entry['teacherEvidence'] = [{'kind': 'emphasis', 'sourceId': 'rec-s1', 'quote': 'important'}]
        with self.assertRaisesRegex(ValueError, 'no excerpt'):
            validate_teacher_evidence(self.entry, {'rec-s1': {'excerpt': ''}})


if __name__ == '__main__':
    unittest.main()
