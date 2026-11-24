#!/usr/bin/env python3
"""Build BMEB316 from reviewed, independently authored page notes.

Supports partial recording coverage within a PDF. Uncovered pages keep the
original PDF, their search text and coverage label; they never gain generated
teacher commentary merely because another page in the same lecture has audio.
Run: python3 build_data.py. No private full transcript files are required.
"""
from pathlib import Path
import copy
import hashlib
import json
from exam_evidence import validate_teacher_evidence

ROOT = Path(__file__).resolve().parent


def load(path):
    return json.loads((ROOT / path).read_text(encoding='utf-8'))


def build():
    index = load('data/slide-index.json')
    provenance = load('data/sources.json')
    guide = load('data/exam-guide.json')
    review = load('data/review-manifest.json')
    data = {
        'title': 'BMEB316 · Medical Image Processing', 'schemaVersion': 2,
        'revision': review['revision'], 'decks': copy.deepcopy(index['decks']),
        'slides': {}, 'assessment': index['assessment'],
        'sources': provenance['sources'], 'recordings': provenance['recordings'],
        'examGuide': guide, 'coverage': review['coverage'],
        'studyPolicy': '考核中心按考试要求、Quiz复盘、老师强调与提问、一般练习、授课范围和课程安排分类。考试要求记录老师说明的准备内容与范围，强调和提问附原话及时间戳。',
        'transcriptPolicy': '逐页结合PDF图示和对应课堂片段编写，时间戳用于定位录音；正文结合课件校正转写错词。课件页分别标注已讲、待讲和老师明确列为选读的内容。',
    }
    proofs = {d['id']: d for d in review['decks']}
    assert len(proofs) == len(review['decks'])
    assert len({d['id'] for d in data['decks']}) == len(data['decks'])
    categories = {c['id'] for c in guide['categories']}
    assert len(categories) == len(guide['categories'])
    for sid, source in data['sources'].items():
        assert source['recording'] in data['recordings'], 'Unknown recording: ' + sid
        assert source.get('excerpt', '').strip() and source.get('start'), 'Unattributed source: ' + sid
    total = explained = 0
    unique = set()
    for d in data['decks']:
        did = d['id']; proof = proofs[did]
        assert hashlib.sha256((ROOT / d['path']).read_bytes()).hexdigest() == proof['pdfSha256'], 'PDF changed; re-review required: ' + did
        assert len(index['slides'][did]) == d['pages'] == proof['pages'], 'Page count mismatch: ' + did
        visually_reviewed = set(proof['visuallyReviewedPages'])
        assert visually_reviewed == set(range(1, d['pages'] + 1)), 'Visual review incomplete: ' + did
        note_file = ROOT / 'data/page-notes' / (did + '.json')
        raw_notes = load('data/page-notes/' + did + '.json') if note_file.exists() else []
        notes = {n['page']: n for n in raw_notes}
        assert len(notes) == len(raw_notes), 'Duplicate page notes: ' + did
        assert all(1 <= p <= d['pages'] for p in notes), 'Invalid note page: ' + did
        assert len(notes) == proof['notePages'], 'Note count mismatch: ' + did
        if 'explainedPages' in proof:
            assert sorted(notes) == proof['explainedPages'], 'Recording coverage changed: ' + did
        d['audio'] = bool(notes)
        d['audioSources'] = list(dict.fromkeys(
            data['recordings'][data['sources'][sid]['recording']]['title']
            for n in notes.values() for sid in n.get('sourceIds', [])
        ))
        pages = []
        for i, old in enumerate(index['slides'][did], 1):
            page = copy.deepcopy(old)
            assert page['page'] == i and page['title'].strip() and not page['title'].strip().isdigit()
            assert all(sid in data['sources'] for sid in page.get('coverageSourceIds', []))
            page['visualReviewed'] = i in visually_reviewed
            page['audioSupported'] = i in notes
            page['note'] = copy.deepcopy(notes.get(i))
            page['examIds'] = [e['id'] for e in guide['entries'] if {'deck': did, 'page': i} in e['anchors']]
            if page['note'] is not None:
                n = page['note']
                assert n['page'] == i and n['visualReviewed']
                assert n.get('audioSupported', True) is True
                assert all(sid in data['sources'] for sid in n['sourceIds'])
                assert n.get('paragraphs') and all(isinstance(t, str) and t.strip() for t in n['paragraphs'])
                if did in ('lec5', 'lec6', 'lec8'):
                    assert n['sourceIds'], 'New explanation lacks classroom provenance'
                text = tuple(n['paragraphs'])
                assert text not in unique, 'Repeated generic note: ' + did + '/' + str(i)
                unique.add(text); explained += 1
            assert page['visualReviewed']
            pages.append(page); total += 1
        data['slides'][did] = pages
    assert len({e['id'] for e in guide['entries']}) == len(guide['entries']), 'Duplicate hub entry'
    for e in guide['entries']:
        assert e['category'] in categories
        validate_teacher_evidence(e, data['sources'])
        assert all(k in data['sources'] for k in e['sourceIds'])
        assert e['sourceIds'] or e.get('sourceType', '').startswith('课件'), 'Unattributed hub entry: ' + e['id']
        for a in e['anchors']:
            assert a['deck'] in data['slides'] and 1 <= a['page'] <= len(data['slides'][a['deck']])
    coverage = dict(visualPages=total, explainedPages=explained, slidesOnlyPages=total-explained,
                    recordings=len(data['recordings']), examEntries=len(guide['entries']))
    assert coverage == review['coverage'], (coverage, review['coverage'])
    (ROOT / 'data/content.json').write_text(json.dumps(data, ensure_ascii=False, separators=(',', ':')) + '\n', encoding='utf-8')
    print('Validated BMEB316:', total, 'reviewed pages;', explained, 'unique notes;', total-explained, 'PPT-only;', len(guide['entries']), 'hub entries.')
    return data


if __name__ == '__main__':
    build()
