#!/usr/bin/env python3
"""Assemble the site from audited per-page notes; never expand generic ranges.

Run from any directory: python3 build_data.py
No private transcripts or PDF extraction dependencies are needed for a rebuild.
"""
from pathlib import Path
import copy, hashlib, json
ROOT=Path(__file__).resolve().parent

def load(path):
    return json.loads((ROOT/path).read_text(encoding='utf-8'))

def build():
    idx=load('data/slide-index.json'); provenance=load('data/sources.json')
    exam=load('data/exam-guide.json'); review=load('data/review-manifest.json')
    data={'title':'BMEB316 · Medical Image Processing','schemaVersion':2,'revision':review['revision'],
          'decks':idx['decks'],'slides':{},'assessment':idx['assessment'],
          'sources':provenance['sources'],'recordings':provenance['recordings'],
          'examGuide':exam,'coverage':review['coverage'],
          'studyPolicy':'考核中心区分明确考核、Quiz复盘、课堂重点、范围与暂定安排。',
          'transcriptPolicy':'每页均按原始PDF画面核对。正文为图示解释与课堂内容整理；出处按内容对应，不代表精确翻页时间。自动转写可能含错词，无整讲录音的部分仅显示PPT。'}
    reviewed={d['id']:d for d in review['decks']}; total=0; unique=set()
    for d in idx['decks']:
        did=d['id']; pdf=ROOT/d['path']; proof=reviewed[did]
        assert hashlib.sha256(pdf.read_bytes()).hexdigest()==proof['pdfSha256'], 'PDF changed; re-review and re-align notes: '+did
        notes=load('data/page-notes/'+did+'.json') if d['audio'] else []
        assert len(notes)==(d['pages'] if d['audio'] else 0), 'Missing page notes: '+did
        pages=[]
        for i,old in enumerate(idx['slides'][did],1):
            page=copy.deepcopy(old);page['visualReviewed']=i in proof['visuallyReviewedPages']
            page['examIds']=[e['id'] for e in exam['entries'] if {'deck':did,'page':i} in e['anchors']]
            page['note']=copy.deepcopy(notes[i-1]) if d['audio'] else None
            if page['note']:
                n=page['note'];assert n['page']==i and n['visualReviewed'];assert all(k in data['sources'] for k in n['sourceIds'])
                txt=tuple(n['paragraphs']);assert txt not in unique,'Duplicate range text';unique.add(txt);total+=1
            assert page['page']==i and page['visualReviewed'];pages.append(page)
        data['slides'][did]=pages
    assert total==review['coverage']['explainedPages']
    for e in exam['entries']:
        assert all(k in data['sources'] for k in e['sourceIds'])
        for a in e['anchors']:assert 1<=a['page']<=len(data['slides'][a['deck']])
    out=ROOT/'data/content.json';out.write_text(json.dumps(data,ensure_ascii=False,separators=(',',':')),encoding='utf-8')
    print('Validated and built:',sum(len(p) for p in data['slides'].values()),'visually reviewed pages;',total,'unique notes;',len(exam['entries']),'hub entries.')
    return data
if __name__=='__main__':build()
