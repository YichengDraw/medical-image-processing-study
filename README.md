# BMEB316 · Medical Image Processing Study Companion

医学图像处理课程（2026 秋季）的逐页伴读网站。**原始 PDF 幻灯片在左、中文辅助理解与教师讲授线索在右**。本项目不是课程官方站点。

## 覆盖

- Lecture 1 — Introduction（98 页）：有课堂录音线索。
- Lecture 2 Part 1 — Image Formation（54 页）：**无对应录音，只显示原始幻灯片**。
- Lecture 2 Part 2 — Sampling, Quantization, Pixels（76 页）：有课堂录音线索。
- Lecture 3 Part 1 — Intensity & Histogram（67 页）：**无对应录音，只显示原始幻灯片**。
- Lecture 3 Part 2 — Spatial Filtering（86 页）：有课堂录音线索。
- Lecture 4 Part 1 — Frequency Analysis（74 页）：有课堂录音线索。
- Lecture 4 Part 2 — Frequency Filtering（61 页）：有课堂录音线索。

本网站目前采用 Mac 课程资料目录中的 Lecture 2 Part 2 版本（76 页）；本次对话上传的同名版本为 72 页，二者包含少量增补/重排内容。其余课件与用户已上传的 PDF 对应。每页可通过侧栏定位，原始 PDF 也可单独打开。

## 使用方式

- **← / →** 或 **J / K**：上页 / 下页。
- **/**：搜索全部课件正文与右侧伴读；输入 **@star** 查看收藏。
- **[**：显示 / 隐藏右侧伴读。
- **F**：切换适应页面 / 适应宽度。
- 点击 ☆ 收藏页面（收藏数据仅存在自己浏览器的 Local Storage）。
- **下个考点**：跳到下一个包含明确考核表述且能匹配到相应录音的页面。

## 注释原则

网站旁栏区分三类信息：

1. **课件解读**：根据原 PDF 解释概念，配一个例子；不是老师的明确强调。
2. **老师课堂讲授**：在录音自动转写的教师发言中可以检索到对应证据，旁栏显示来源、时间戳与核对用短片段。
3. **考核相关 · 明确**：只用于直接涉及考试、题型、概念考核要求等口头表述。并不表示一定考该页。

自动转写可能有错字；部分段落和 PPT 页面无法严格一对一同步。为避免虚构，缺少可靠对应发言的页面不显示教师强调。网站不会公开完整的课堂录音转写，避免包含无关的学生个人介绍。课程要求以教师及 Blackboard 正式公告为准。

## 技术

纯静态 HTML / CSS / JS，使用本地打包的 PDF.js；PDF 原样保存在 `assets/pdfs/`，不依赖第三方云端 PDF 预览。数据索引为 `data/content.json`，通过 `build_data.py` 从本地 PDF 与课堂讲授证据生成。

## 本地预览

在项目目录运行 `python3 -m http.server 8000`，访问 `http://localhost:8000/`。请勿直接用 `file://` 打开 HTML，因为浏览器通常禁止直接读取 JSON 和 PDF 资源。

课程资料仅限教学复习用途；原课件版权归其原作者。需要时可移除公开的原始 PDF，改为个人本地部署。
