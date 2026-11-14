#!/usr/bin/env python3
"""Build HUM053 from reviewed slides, page notes and selected teaching excerpts.

Run from the repository: python3 hum053/build_data.py
No private transcript or uploaded PPTX is required to rebuild the public data.
"""
from pathlib import Path
import copy
import hashlib
import json
import re

ROOT = Path(__file__).resolve().parent
SITE = ROOT.parent
EXPECTED_PAGES = {'lec1': 43, 'lec2': 44, 'lec3': 36, 'lec4': 30,
                  'lec5': 34, 'lec6': 49, 'lec7': 37, 'lec8': 50,
                  'lec9': 58, 'lec10': 57}
PRIMARY_RECORDING = {'lec1': 'rec20', 'lec2': 'rec19', 'lec3': 'rec18',
                     'lec4': 'rec17', 'lec5': 'rec16', 'lec6': 'rec15',
                     'lec7': 'rec14', 'lec8': 'rec13', 'lec9': 'rec12',
                     'lec10': 'rec11'}
EMAIL = re.compile(r'[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}', re.I)


def load(name):
    return json.loads((ROOT / 'data' / name).read_text(encoding='utf-8'))


def build():
    index, provenance, guide, review = map(load, (
        'slide-index.json', 'sources.json', 'exam-guide.json', 'review-manifest.json'))
    data = {
        'title': 'HUM053 · 中国哲学导论',
        'schemaVersion': 2,
        'revision': review['revision'],
        'decks': copy.deepcopy(index['decks']),
        'slides': {},
        'assessment': copy.deepcopy(index.get('assessment', {'exam': 50})),
        'assessmentLabels': copy.deepcopy(index.get('assessmentLabels', {'exam': '随堂考试'})),
        'sources': copy.deepcopy(provenance['sources']),
        'recordings': copy.deepcopy(provenance['recordings']),
        'examGuide': copy.deepcopy(guide),
        'coverage': copy.deepcopy(review['coverage']),
        'studyPolicy': '最新通知为闭卷、孔子—孟子—庄子、占总评50%。明确考核、课堂重点、比较与自拟练习分别标注；练习不是已知试题。导论作为背景阅读。',
        'transcriptPolicy': '逐页核对课件画面与课堂转写。本讲录音优先；若仅有其他讲次对同一内容的复述，明确标为跨讲复述，不冒充本讲当时录音。出处按内容对应，不代表精确翻页时间；自动转写可能有错词。完全没有对应讲授来源的页面仅展示课件。',
    }
    assert [d['id'] for d in data['decks']] == list(EXPECTED_PAGES), 'Lecture order must follow the actual lecture number'
    assert data['assessment'] == {'exam': 50}, 'Use the current in-class exam notice, not the historical final-exam allocation'
    assert data['assessmentLabels']['exam'] == '随堂考试'
    assert set(index['slides']) == set(EXPECTED_PAGES)
    proof = {d['id']: d for d in review['decks']}
    assert set(proof) == set(EXPECTED_PAGES)
    categories = {c['id'] for c in guide['categories']}
    assert len(categories) == len(guide['categories']), 'Duplicate exam category'
    assert len({e['id'] for e in guide['entries']}) == len(guide['entries']), 'Duplicate exam entry'
    for sid, source in data['sources'].items():
        assert source.get('recording') in data['recordings'], f'Unknown recording: {sid}'
        assert source.get('excerpt', '').strip(), f'Empty excerpt: {sid}'
        assert source.get('start'), f'Missing source location: {sid}'
        assert not EMAIL.search(source['excerpt']), f'Contact details in source excerpt: {sid}'
    seen_notes, total, explained = set(), 0, 0
    same_lecture_audio, cross_lecture_only = 0, 0
    for deck in data['decks']:
        did = deck['id']
        expected_pages = EXPECTED_PAGES[did]
        assert deck['pages'] == expected_pages == proof[did]['pages']
        assert len(index['slides'][did]) == expected_pages
        pdf_path = SITE / deck['path']
        assert pdf_path.is_file(), f'Missing PDF: {did}'
        assert hashlib.sha256(pdf_path.read_bytes()).hexdigest() == proof[did]['pdfSha256'], f'PDF hash changed: {did}'
        reviewed = set(proof[did]['visuallyReviewedPages'])
        assert reviewed == set(range(1, expected_pages + 1)), f'Incomplete visual review: {did}'
        raw_notes = load(f'page-notes/{did}.json')
        notes = {n['page']: n for n in raw_notes}
        assert len(notes) == len(raw_notes), f'Duplicate note page: {did}'
        assert all(type(p) is int and 1 <= p <= expected_pages for p in notes)
        if isinstance(proof[did].get('explainedPages'), list):
            assert sorted(notes) == proof[did]['explainedPages'], f'Coverage differs from manifest: {did}'
        if 'notePages' in proof[did]:
            assert len(notes) == proof[did]['notePages']
        deck['audio'] = bool(notes)
        deck['audioSources'] = list(dict.fromkeys(
            data['recordings'][data['sources'][sid]['recording']]['title']
            for n in notes.values() for sid in n.get('sourceIds', [])
        ))
        pages = []
        for number, original in enumerate(index['slides'][did], 1):
            page = copy.deepcopy(original)
            assert page['page'] == number
            assert page.get('title', '').strip() and not page['title'].strip().isdigit()
            assert '待核对' not in page['title'], f'Unresolved image caption: {did}/{number}'
            assert not EMAIL.search(page.get('sourceText', '') + page.get('searchText', ''))
            page['visualReviewed'] = True
            page['note'] = copy.deepcopy(notes.get(number))
            if page['note'] is not None:
                note = page['note']
                primary = PRIMARY_RECORDING[did]
                same = any(str(source_id).startswith(primary + '-') for source_id in note.get('sourceIds', []))
                note['sameLectureAudio'] = same
                note['sourceScope'] = ('本讲录音为主；其他讲次仅作补充' if same and any(
                    not str(source_id).startswith(primary + '-') for source_id in note.get('sourceIds', [])
                ) else ('本讲录音' if same else '跨讲复述：来源是老师在其他讲次对相同内容的讲解，不代表本讲当时录音'))
                if same:
                    same_lecture_audio += 1
                else:
                    cross_lecture_only += 1
            page['audioSupported'] = page['note'] is not None
            page['sameLectureAudio'] = bool(page['note'] and page['note'].get('sameLectureAudio'))
            page['examIds'] = [e['id'] for e in guide['entries'] if {'deck': did, 'page': number} in e.get('anchors', [])]
            if page['note'] is not None:
                note = page['note']
                assert note.get('visualReviewed') is True, f'Unreviewed note: {did}/{number}'
                assert note.get('audioSupported', True) is True
                assert note.get('sourceIds'), f'No teaching source: {did}/{number}'
                assert all(s in data['sources'] for s in note['sourceIds']), f'Unknown source: {did}/{number}'
                paragraphs = note.get('paragraphs')
                assert paragraphs and all(isinstance(p, str) and p.strip() for p in paragraphs)
                assert not EMAIL.search('\n'.join(paragraphs))
                signature = tuple(paragraphs)
                assert signature not in seen_notes, f'Duplicate generic note: {did}/{number}'
                seen_notes.add(signature)
                explained += 1
            pages.append(page)
            total += 1
        data['slides'][did] = pages
    for entry in guide['entries']:
        eid = entry['id']
        assert entry.get('category') in categories, f'Unknown category: {eid}'
        assert entry.get('title', '').strip() and entry.get('body', '').strip()
        assert all(s in data['sources'] for s in entry.get('sourceIds', [])), f'Unknown hub source: {eid}'
        assert entry.get('sourceIds') or entry.get('sourceType', '').strip(), f'Unattributed hub entry: {eid}'
        assert isinstance(entry.get('anchors'), list), f'Anchors must be a list: {eid}'
        for anchor in entry['anchors']:
            assert anchor['deck'] in EXPECTED_PAGES
            assert type(anchor['page']) is int and 1 <= anchor['page'] <= EXPECTED_PAGES[anchor['deck']]
    expected = dict(visualPages=total, explainedPages=explained,
                    slidesOnlyPages=total-explained,
                    sameLectureAudioPages=same_lecture_audio,
                    crossLectureOnlyPages=cross_lecture_only,
                    recordings=len(data['recordings']), examEntries=len(guide['entries']))
    for field, value in expected.items():
        assert data['coverage'].get(field) == value, f'Coverage mismatch: {field}: {data["coverage"].get(field)} != {value}'
    assert total == 438
    (ROOT / 'data/content.json').write_text(json.dumps(data, ensure_ascii=False, separators=(',', ':')) + '\n', encoding='utf-8')
    print(f'Validated HUM053: {total} reviewed pages, {explained} independent notes, {total-explained} PPT-only pages, {len(guide["entries"])} exam/review entries.')
    return data


if __name__ == '__main__':
    build()
