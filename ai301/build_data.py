#!/usr/bin/env python3
"""Build the AI301 companion from reviewed, independently written page notes.

Run: python3 ai301/build_data.py
All inputs are public course materials or selected, attributed teaching excerpts.
The private source transcripts are deliberately not part of this repository.
"""
from pathlib import Path
import copy
import hashlib
import json

ROOT = Path(__file__).resolve().parent
SITE = ROOT.parent


def load(name):
    return json.loads((ROOT / 'data' / name).read_text(encoding='utf-8'))


def build():
    index = load('slide-index.json')
    provenance = load('sources.json')
    guide = load('exam-guide.json')
    review = load('review-manifest.json')
    data = {
        'title': 'AI301 · Computer System Architecture',
        'schemaVersion': 2,
        'revision': review['revision'],
        'decks': copy.deepcopy(index['decks']),
        'slides': {},
        'assessment': index.get('assessment', {}),
        'sources': provenance['sources'],
        'recordings': provenance['recordings'],
        'examGuide': guide,
        'coverage': review['coverage'],
        'studyPolicy': '考核中心区分明确考核、Quiz复盘、课堂重点、范围与选读、课程安排。课堂练习与重点不等于必考。',
        'transcriptPolicy': '逐页对照原始PDF图示与课堂转写编写。页码按PDF实际顺序计算，可能与课件页脚编号不同。出处按内容对应，不代表精确翻页时间；转写可能有错词。未提供对应录音的页面仅展示PPT。',
    }
    proof = {d['id']: d for d in review['decks']}
    seen_text = set()
    explained = 0
    total = 0
    categories = {c['id'] for c in guide['categories']}
    assert len(categories) == len(guide['categories'])
    assert len({d['id'] for d in data['decks']}) == len(data['decks'])
    for sid, source in data['sources'].items():
        assert source['recording'] in data['recordings'], f'Unknown recording: {sid}'
        assert source.get('excerpt', '').strip() and source.get('start'), f'Unattributed source: {sid}'

    for deck in data['decks']:
        did = deck['id']
        assert hashlib.sha256((SITE / deck['path']).read_bytes()).hexdigest() == proof[did]['pdfSha256'], f'PDF changed: {did}'
        assert len(index['slides'][did]) == deck['pages'] == proof[did]['pages']
        reviewed = set(proof[did]['visuallyReviewedPages'])
        assert reviewed == set(range(1, deck['pages'] + 1)), f'Incomplete visual review: {did}'
        raw_notes = load(f'page-notes/{did}.json')
        notes = {n['page']: n for n in raw_notes}
        assert len(notes) == len(raw_notes), f'Duplicate note page: {did}'
        assert all(1 <= p <= deck['pages'] for p in notes), f'Out-of-range note: {did}'
        assert sorted(notes) == proof[did]['explainedPages'], f'Coverage mismatch: {did}'
        deck['audio'] = bool(notes)
        deck['audioSources'] = list(dict.fromkeys(
            data['recordings'][data['sources'][sid]['recording']]['title']
            for n in notes.values() for sid in n.get('sourceIds', [])
        ))
        pages = []
        for expected, original in enumerate(index['slides'][did], 1):
            page = copy.deepcopy(original)
            assert page['page'] == expected and page['title'].strip()
            assert not page['title'].strip().isdigit(), f'Page number mistaken for title: {did}/{expected}'
            page['visualReviewed'] = True
            page['audioSupported'] = expected in notes
            page['note'] = copy.deepcopy(notes.get(expected))
            page['examIds'] = [e['id'] for e in guide['entries'] if {'deck': did, 'page': expected} in e['anchors']]
            if page['note'] is not None:
                note = page['note']
                assert note.get('visualReviewed') is True
                assert note.get('audioSupported', True) is True
                assert note.get('sourceIds'), f'Missing classroom provenance: {did}/{expected}'
                assert all(sid in data['sources'] for sid in note['sourceIds']), f'Unknown source: {did}/{expected}'
                assert note.get('paragraphs') and all(isinstance(p, str) and p.strip() for p in note['paragraphs'])
                signature = tuple(note['paragraphs'])
                assert signature not in seen_text, f'Repeated generic explanation: {did}/{expected}'
                seen_text.add(signature)
                explained += 1
            pages.append(page)
            total += 1
        data['slides'][did] = pages

    assert len({e['id'] for e in guide['entries']}) == len(guide['entries']), 'Duplicate exam hub ID'
    for entry in guide['entries']:
        assert entry['category'] in categories
        assert entry['anchors'] or entry['category'] == 'arrangement', f'No slide reference: {entry["id"]}'
        assert all(sid in data['sources'] for sid in entry.get('sourceIds', [])), f'Unknown hub source: {entry["id"]}'
        assert entry.get('sourceIds') or entry.get('sourceType', '').startswith('课件'), f'Unsourced hub entry: {entry["id"]}'
        for anchor in entry['anchors']:
            assert anchor['deck'] in data['slides']
            assert 1 <= anchor['page'] <= len(data['slides'][anchor['deck']])
    expected_coverage = dict(visualPages=total, explainedPages=explained, slidesOnlyPages=total-explained,
                             recordings=len(data['recordings']), examEntries=len(guide['entries']))
    assert data['coverage'] == expected_coverage, (data['coverage'], expected_coverage)
    (ROOT / 'data/content.json').write_text(json.dumps(data, ensure_ascii=False, separators=(',', ':')) + '\n', encoding='utf-8')
    print(f'Validated AI301: {total} reviewed pages, {explained} unique explanations, {total-explained} PPT-only pages, {len(guide["entries"])} hub entries.')
    return data


if __name__ == '__main__':
    build()
