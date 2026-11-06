#!/usr/bin/env python3
"""Build the searchable, source-linked slide manifest. Original PDFs remain unchanged."""
from pathlib import Path
import re, json, shutil, hashlib
from pypdf import PdfReader

ROOT=Path(__file__).resolve().parent
SRC=ROOT.parent
DECKS=[
 dict(id="lec1",group="Lecture 1",label="Introduction",cn="医学图像处理概论",file="Lecture 1_Introduction_v8.pdf",audio=True,color="#5d87ef"),
 dict(id="lec2p1",group="Lecture 2",label="Image Formation · Part 1",cn="视觉感知、传感器与噪声",file="Lecture 2_Basics for Image Formation_v8_Part1.pdf",audio=False,color="#9d78e9"),
 dict(id="lec2p2",group="Lecture 2",label="Image Formation · Part 2",cn="采样、量化、插值与像素关系",file="Lecture 2_Basics for Image Formation_v8_1_Part2(1).pdf",audio=True,color="#9d78e9"),
 dict(id="lec3p1",group="Lecture 3",label="Image Enhancement · Part 1",cn="灰度映射与直方图增强",file="Lecture 3_ Image Enhancement_v9_Part1 (1).pdf",audio=False,color="#28a68b"),
 dict(id="lec3p2",group="Lecture 3",label="Spatial Filtering · Part 2",cn="空间滤波与锐化",file="Lecture 3_ Image Enhancement_v9_Part2(1) (1).pdf",audio=True,color="#28a68b"),
 dict(id="lec4p1",group="Lecture 4",label="Frequency Filtering · Part 1",cn="傅里叶变换与频谱",file="Lecture 4_ FrequencyFiltering v90_Part1.pdf",audio=True,color="#eb9d60"),
 dict(id="lec4p2",group="Lecture 4",label="Frequency Filtering · Part 2",cn="频域滤波器与应用",file="Lecture 4_ FrequencyFiltering v9_Part2.pdf",audio=True,color="#eb9d60"),
]
SOURCE_NAME={
 "lec1_transcript.txt":"09月11日课堂录音",
 "lec1_lec2_transition_transcript.txt":"09月18日课堂录音",
 "lec2_part2_transcript.txt":"采样、量化与像素关系录音",
 "lec3_part2_transcript.txt":"空间滤波与锐化录音",
 "lec3_to_lec4_transcript.txt":"Quiz复盘与傅里叶录音",
 "lec4_part2_transcript.txt":"频域滤波与复原录音",
}
NOISE=re.compile(r"^(?:20\d\d/\d+/\d+|\d+|Yiming Li|liym2019@|南方科技大学|Southern University of Science)",re.I)
HEADER=re.compile(r"发言人\s*(\d+)\s+(\d{2}:\d{2}(?::\d{2})?)(?:\s*-\s*(\d{2}:\d{2}(?::\d{2})?))?")
def norm(x):return re.sub(r"[\s,，.。：:；;?？!！\-·（）()]+","",x or "").lower()
def teacher_segments(name):
    f=ROOT/".source-transcripts"/name
    if not f.exists(): return []
    s=re.sub(r"<PARSED TEXT FOR PAGE:\s*\d+\s*/\s*\d+>","",f.read_text(encoding="utf-8"))
    marks=list(HEADER.finditer(s));out=[]
    for i,m in enumerate(marks):
        if m.group(1)!="1":continue
        seg=s[m.end():marks[i+1].start() if i+1<len(marks) else len(s)]
        seg=re.sub(r"\s+"," ",seg).strip()
        if len(seg)>30:out.append({"time":m.group(2),"text":seg})
    return out
SOURCES={k:teacher_segments(k) for k in SOURCE_NAME}
GUIDES=[json.loads(x) for x in (ROOT/"data/guides.ndjson").read_text().splitlines() if x.strip()]
def get_evidence(g):
    teacher=g.get("teacher","")
    if not teacher:return None
    src=g.get("source","")
    needle=norm(g.get("needle",""))
    segments=SOURCES.get(src,[])
    if not needle:return None
    candidate=next((p for p in segments if needle in norm(p["text"])),None)
    if not candidate:
        # fall back only when multiple meaningful tokens match the same speech segment
        words=[w for w in re.split(r"[ ,，；;、/]+",g.get("needle","")) if len(w)>=3]
        matches=[(sum(norm(w) in norm(p["text"]) for w in words),p) for p in segments]
        matches.sort(key=lambda x:x[0],reverse=True)
        if len(words)>=2 and matches and matches[0][0]>=max(2,len(words)-1):candidate=matches[0][1]
    if not candidate:return None
    excerpt=candidate["text"][:290]
    return {"text":teacher,"source":SOURCE_NAME.get(src,src),"time":candidate["time"],"excerpt":excerpt,"explicit":g.get("level")=="explicit"}
def page_title(text,number):
    ls=[re.sub(r"\s+"," ",ln).strip(" \t•□▷➢❑") for ln in text.splitlines()]
    ls=[x for x in ls if x and not NOISE.match(x) and not re.fullmatch(r"\d+",x)]
    ls=[x for x in ls if "@" not in x and 4<=len(x)<=115]
    if not ls:return f"第 {number} 页 · 图示"
    for x in ls[:8]:
        if not re.match(r"(What|Why|Which|How)\b.*\?$",x) and len(x)<85:return x
    return ls[0]
def page_excerpt(text, title):
    ls=[re.sub(r"\s+"," ",x).strip() for x in text.splitlines()]
    seen=set();chosen=[]
    for s in ls:
        s=s.strip("•□▷➢❑▪◼\u25aa \t")
        if not s or s==title or NOISE.match(s) or len(s)<13 or s in seen:continue
        if re.match(r"^\s*(?:M|N|G|P|Q|g\(|f\(|F\(|H\()\\",s):continue
        seen.add(s);chosen.append(s[:170])
        if len(chosen)==4:break
    return chosen
slides={}
for d in DECKS:
    infile=SRC/d["file"]
    if not infile.exists(): raise FileNotFoundError(infile)
    outfile=ROOT/"assets/pdfs"/(d["id"]+".pdf")
    if not outfile.exists() or outfile.stat().st_size!=infile.stat().st_size:
        shutil.copyfile(infile,outfile)
    reader=PdfReader(str(infile))
    d["pages"]=len(reader.pages)
    d["path"]="assets/pdfs/"+d["id"]+".pdf"
    d["firstSlide"]=page_title(reader.pages[0].extract_text() or "",1)
    d["audioSources"]=sorted({SOURCE_NAME[g.get("source")] for g in GUIDES if g["deck"]==d["id"] and g.get("source") in SOURCE_NAME}) if d["audio"] else []
    infos=[]
    relevant=[g for g in GUIDES if g["deck"]==d["id"]]
    for i,page in enumerate(reader.pages,1):
        content=(page.extract_text() or "")
        title=page_title(content,i)
        g=next((x for x in relevant if x["from"]<=i<=x["to"]),None)
        evidence=get_evidence(g) if g and d["audio"] else None
        infos.append({
            "page":i,"title":title,"excerpt":page_excerpt(content,title),
            "searchText":(title+"\n"+content)[:2800],
            "guide":({k:g.get(k,"") for k in ("concept","example","trap","level")} if g and d["audio"] else None),
            "evidence":evidence,
            "isExam":bool(evidence and evidence["explicit"]),
        })
    slides[d["id"]]=infos
    print(d["id"],d["pages"],"pages",sum(bool(p["guide"]) for p in infos),"guided",sum(bool(p["evidence"]) for p in infos),"teacher-sourced")
manifest={"title":"BMEB316 · Medical Image Processing", "decks":DECKS, "slides":slides,
    "assessment":{"attendance":5,"quiz":10,"projects":30,"exam":40,"presentation":15},
    "studyPolicy":"老师明确表示考核以基本概念和方法选择为主，不考代码与逐项公式推导；Quiz 题目有机会在期末复现。",
    "transcriptPolicy":"侧栏是课程辅助整理，不是逐字同步字幕。课堂强调仅在对应录音中找到证据时显示；转录可能含识别错误。无可用录音的课件只展示原始幻灯片。"}
(ROOT/"data/content.json").write_text(json.dumps(manifest,ensure_ascii=False,separators=(",",":")),encoding="utf-8")
print("manifest", (ROOT/"data/content.json").stat().st_size, "bytes")
