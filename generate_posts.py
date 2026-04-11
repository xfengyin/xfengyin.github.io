#!/usr/bin/env python3
"""
从 _posts/*.md 重新生成 post/*.html，修复代码块渲染异常。
添加 Prism.js 语法高亮、Mermaid.js 流程图、代码复制按钮、TOC 等。
"""

import os
import re
import glob
import yaml
import markdown
from markdown.extensions.toc import TocExtension
from markdown.extensions.fenced_code import FencedCodeExtension
from datetime import datetime

# ─── 文件名映射 ───────────────────────────────────────────
FILENAME_MAP = {
    "2026-04-03-zen-framework.md": "zen-framework.html",
    "2026-04-03-kongming-microservices.md": "kongming-microservices.html",
    "2026-04-03-xingju-dev-notes.md": "xingju-dev-notes.html",
    "2026-04-03-cyberpunk-ui-design.md": "cyberpunk-ui.html",
    "2026-04-03-blog-optimization-notes.md": "blog-optimization.html",
    "2024-12-01-blog-guide-index.md": "blog-guide-index.html",
    "2024-09-20-sensor-calibration.md": "sensor-calibration.html",
    "2024-09-01-power-integrity.md": "power-integrity.html",
    "2024-08-15-oscilloscope-guide.md": "oscilloscope-guide.html",
    "2024-08-01-pcb-design-checklist.md": "pcb-design-checklist.html",
    "2024-07-17-qs03b-test.md": "qs03b-test.html",
    "2024-07-17-mos-gate-resistor.md": "mos-gate-resistor.html",
    "2024-07-17-hardware-test-battery.md": "battery-test.html",
    "2024-07-17-gitignore-guide.md": "gitignore-guide.html",
    "2024-07-17-esp32-micropython.md": "esp32-micropython.html",
    "2024-07-17-electric-bike.md": "electric-bike.html",
    "2026-04-14-wetdry-cleaner-battery-test.md": "wetdry-cleaner-battery.html",
}

# ─── 分类到标签的映射 ────────────────────────────────────
CATEGORY_TAG_MAP = {
    "Python": "Python",
    "架构设计": "框架",
    "Go": "Go",
    "微服务": "微服务",
    "前端": "前端",
    "UI设计": "设计",
    "博客": "博客",
    "硬件测试": "测试",
    "传感器": "传感器",
    "信号完整性": "信号完整性",
    "电源设计": "电源",
    "仪器使用": "仪器",
    "PCB设计": "PCB",
    "嵌入式": "嵌入式",
    "电池测试": "电池",
    "Git": "Git",
    "ESP32": "ESP32",
    "硬件设计": "硬件",
    "交通出行": "出行",
    "清洁设备": "测试",
}

# ─── 共享 CSS（抽取出来，不再每个文件重复 200 行）──────────
SHARED_CSS = """
:root {
    --primary: #6366f1;
    --primary-dark: #4f46e5;
    --secondary: #8b5cf6;
    --accent: #ec4899;
    --bg: #0f0f1a;
    --bg-card: #16162a;
    --bg-code: #0d1117;
    --text: #f1f5f9;
    --text-muted: #94a3b8;
    --border: rgba(255,255,255,0.08);
    --gradient-1: linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #ec4899 100%);
    --shadow: 0 8px 32px rgba(99, 102, 241, 0.15);
}
* { margin: 0; padding: 0; box-sizing: border-box; }
body {
    font-family: 'Inter', 'Noto Sans SC', sans-serif;
    background: var(--bg);
    color: var(--text);
    line-height: 1.8;
}
.bg-animation {
    position: fixed;
    top: 0; left: 0; width: 100%; height: 100%;
    z-index: -1;
    background:
        radial-gradient(circle at 20% 80%, rgba(99, 102, 241, 0.05) 0%, transparent 50%),
        radial-gradient(circle at 80% 20%, rgba(139, 92, 246, 0.05) 0%, transparent 50%);
}

/* ─── 导航栏 ─── */
nav {
    position: fixed;
    top: 0; left: 0; right: 0;
    z-index: 1000;
    padding: 1rem 2rem;
    background: rgba(15, 15, 26, 0.9);
    backdrop-filter: blur(20px);
    border-bottom: 1px solid var(--border);
}
.nav-container {
    max-width: 900px;
    margin: 0 auto;
    display: flex;
    justify-content: space-between;
    align-items: center;
}
.logo {
    font-size: 1.25rem;
    font-weight: 700;
    background: var(--gradient-1);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    text-decoration: none;
}
.nav-links {
    display: flex;
    gap: 1.5rem;
    list-style: none;
}
.nav-links a {
    color: var(--text-muted);
    text-decoration: none;
    font-weight: 500;
    font-size: 0.9rem;
    transition: color 0.3s;
}
.nav-links a:hover { color: var(--text); }

/* ─── 文章容器 ─── */
.article-container {
    max-width: 800px;
    margin: 0 auto;
    padding: 8rem 2rem 4rem;
}
.article-header {
    text-align: center;
    margin-bottom: 3rem;
    padding-bottom: 2rem;
    border-bottom: 1px solid var(--border);
}
.article-tag {
    display: inline-block;
    padding: 0.5rem 1rem;
    background: rgba(99, 102, 241, 0.15);
    color: var(--primary);
    border-radius: 20px;
    font-size: 0.8rem;
    font-weight: 600;
    margin-bottom: 1rem;
}
.article-header h1 {
    font-size: 2.2rem;
    font-weight: 700;
    margin-bottom: 1rem;
    line-height: 1.3;
}
.article-meta {
    color: var(--text-muted);
    font-size: 0.9rem;
}
.back-to-home {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    color: var(--text-muted);
    text-decoration: none;
    margin-bottom: 2rem;
    transition: color 0.3s;
}
.back-to-home:hover { color: var(--primary); }

/* ─── 文章内容 ─── */
.article-content {
    font-size: 1.05rem;
    line-height: 1.9;
}
.article-content h2 {
    font-size: 1.6rem;
    font-weight: 600;
    margin: 2.5rem 0 1rem;
    color: var(--text);
    padding-bottom: 0.5rem;
    border-bottom: 2px solid var(--primary);
    display: inline-block;
}
.article-content h3 {
    font-size: 1.3rem;
    font-weight: 600;
    margin: 2rem 0 1rem;
    color: var(--secondary);
}
.article-content h4 {
    font-size: 1.1rem;
    font-weight: 600;
    margin: 1.5rem 0 0.75rem;
    color: var(--text);
}
.article-content p {
    margin-bottom: 1.25rem;
    color: var(--text);
}
.article-content ul, .article-content ol {
    margin: 1rem 0 1.5rem 1.5rem;
}
.article-content li {
    margin-bottom: 0.5rem;
    color: var(--text);
}
.article-content strong {
    color: var(--accent);
    font-weight: 600;
}
.article-content code {
    background: var(--bg-code);
    padding: 0.2rem 0.5rem;
    border-radius: 4px;
    font-family: 'JetBrains Mono', monospace;
    font-size: 0.9em;
    color: var(--accent);
}
.article-content blockquote {
    border-left: 4px solid var(--primary);
    padding-left: 1.5rem;
    margin: 1.5rem 0;
    color: var(--text-muted);
    font-style: italic;
}

/* ─── 表格 ─── */
.article-content table {
    width: 100%;
    border-collapse: collapse;
    margin: 1.5rem 0;
    font-size: 0.95rem;
    display: block;
    overflow-x: auto;
}
.article-content th, .article-content td {
    padding: 0.75rem 1rem;
    text-align: left;
    border-bottom: 1px solid var(--border);
    white-space: nowrap;
}
.article-content th {
    background: var(--bg-card);
    font-weight: 600;
    color: var(--primary);
}
.article-content tr:nth-child(even) {
    background: rgba(99, 102, 241, 0.03);
}
.article-content tr:hover {
    background: rgba(99, 102, 241, 0.05);
}
.article-content hr {
    border: none;
    height: 1px;
    background: var(--border);
    margin: 2rem 0;
}

/* ─── 代码块 ─── */
.article-content pre {
    background: var(--bg-code);
    padding: 0;
    border-radius: 12px;
    overflow: hidden;
    margin: 1.5rem 0;
    border: 1px solid var(--border);
    position: relative;
}
.article-content pre code {
    background: none;
    padding: 0;
    color: var(--text);
    font-family: 'JetBrains Mono', monospace;
    font-size: 0.875rem;
    line-height: 1.6;
}

/* ─── 代码块头部（语言标签 + 复制按钮）─── */
.code-block-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.5rem 1rem;
    background: rgba(255,255,255,0.04);
    border-bottom: 1px solid var(--border);
    font-size: 0.8rem;
}
.code-block-lang {
    color: var(--text-muted);
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    font-family: 'Inter', 'Noto Sans SC', sans-serif;
}
.code-copy-btn {
    background: none;
    border: 1px solid var(--border);
    color: var(--text-muted);
    padding: 0.25rem 0.75rem;
    border-radius: 6px;
    cursor: pointer;
    font-size: 0.8rem;
    font-family: 'Inter', 'Noto Sans SC', sans-serif;
    transition: all 0.2s;
    display: flex;
    align-items: center;
    gap: 0.3rem;
}
.code-copy-btn:hover {
    color: var(--text);
    border-color: var(--primary);
    background: rgba(99, 102, 241, 0.1);
}
.code-copy-btn.copied {
    color: #10b981;
    border-color: #10b981;
}

/* ─── Prism 行号 ─── */
pre[class*="language-"].line-numbers {
    padding-left: 3.8em;
}
pre[class*="language-"].line-numbers .line-numbers-rows {
    border-right: 1px solid var(--border);
}

/* ─── Mermaid ─── */
.mermaid {
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: 12px;
    padding: 1.5rem;
    margin: 1.5rem 0;
    text-align: center;
    overflow-x: auto;
}

/* ─── TOC 侧边栏 ─── */
.toc-sidebar {
    position: fixed;
    top: 6rem;
    right: 2rem;
    width: 220px;
    max-height: calc(100vh - 8rem);
    overflow-y: auto;
    padding: 1rem;
    font-size: 0.8rem;
    line-height: 1.5;
    scrollbar-width: thin;
    scrollbar-color: var(--border) transparent;
}
.toc-sidebar::-webkit-scrollbar { width: 4px; }
.toc-sidebar::-webkit-scrollbar-thumb { background: var(--border); border-radius: 4px; }
.toc-title {
    font-weight: 700;
    color: var(--text);
    margin-bottom: 0.75rem;
    font-size: 0.85rem;
    text-transform: uppercase;
    letter-spacing: 0.5px;
}
.toc-sidebar ul {
    list-style: none;
    padding: 0;
    margin: 0;
}
.toc-sidebar li {
    margin-bottom: 0.35rem;
}
.toc-sidebar a {
    color: var(--text-muted);
    text-decoration: none;
    transition: color 0.2s;
    display: block;
    padding: 0.15rem 0;
}
.toc-sidebar a:hover {
    color: var(--primary);
}
.toc-sidebar .toc-h2 { padding-left: 0; }
.toc-sidebar .toc-h3 { padding-left: 1rem; }
.toc-sidebar .toc-h4 { padding-left: 2rem; }
.toc-sidebar .toc-active {
    color: var(--primary);
    border-left: 2px solid var(--primary);
    padding-left: 0.5rem;
}

/* ─── 返回顶部 ─── */
.back-to-top {
    position: fixed;
    bottom: 2rem;
    right: 2rem;
    width: 44px;
    height: 44px;
    border-radius: 50%;
    background: var(--primary);
    color: white;
    border: none;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.2rem;
    opacity: 0;
    visibility: hidden;
    transition: all 0.3s;
    z-index: 999;
    box-shadow: 0 4px 16px rgba(99, 102, 241, 0.3);
}
.back-to-top.visible {
    opacity: 1;
    visibility: visible;
}
.back-to-top:hover {
    background: var(--primary-dark);
    transform: translateY(-2px);
}

/* ─── Footer ─── */
footer {
    text-align: center;
    padding: 3rem 2rem;
    border-top: 1px solid var(--border);
    margin-top: 4rem;
    color: var(--text-muted);
}

/* ─── 响应式 ─── */
@media (max-width: 1200px) {
    .toc-sidebar { display: none; }
}
@media (max-width: 768px) {
    .article-container { padding: 7rem 1.5rem 3rem; }
    .article-header h1 { font-size: 1.6rem; }
    .nav-links { display: none; }
    .article-content pre { border-radius: 8px; }
}

/* ─── Prism Tomorrow Night 覆盖 ─── */
code[class*="language-"],
pre[class*="language-"] {
    font-family: 'JetBrains Mono', monospace;
    font-size: 0.875rem;
    line-height: 1.6;
    white-space: pre;
    word-spacing: normal;
    word-break: normal;
    word-wrap: normal;
    tab-size: 4;
    background: none;
}
pre[class*="language-"] {
    padding: 1.25rem;
    margin: 0;
    overflow: auto;
}
"""

# ─── HTML 模板 ────────────────────────────────────────────
def build_html(title: str, description: str, tag: str, date_str: str,
               reading_time: str, toc_html: str, content_html: str,
               last_updated: str) -> str:
    return f"""<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{title} | xfengyin</title>
    <meta name="description" content="{description}">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Noto+Sans+SC:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">

    <!-- Prism.js CSS -->
    <link href="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/themes/prism-tomorrow.min.css" rel="stylesheet">
    <link href="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/plugins/line-numbers/prism-line-numbers.min.css" rel="stylesheet">

    <style>{SHARED_CSS}</style>
</head>
<body>
    <div class="bg-animation"></div>
    <nav>
        <div class="nav-container">
            <a href="../" class="logo">xfengyin</a>
            <ul class="nav-links">
                <li><a href="../#articles">文章</a></li>
                <li><a href="../#skills">技能</a></li>
                <li><a href="https://github.com/xfengyin">GitHub</a></li>
            </ul>
        </div>
    </nav>

    <article class="article-container">
        <a href="../" class="back-to-home">← 返回首页</a>
        <header class="article-header">
            <span class="article-tag">{tag}</span>
            <h1>{title}</h1>
            <div class="article-meta">📅 {date_str} · ⏱️ 阅读时间约 {reading_time}</div>
        </header>
        <div class="article-content">
{content_html}
        </div>
    </article>

    {toc_html}

    <button class="back-to-top" id="backToTop" title="返回顶部">↑</button>

    <footer>
        <p>© 2024-2026 xfengyin. 荣耀存于心，而非留于形。</p>
    </footer>

    <!-- Prism.js -->
    <script src="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/prism.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/plugins/line-numbers/prism-line-numbers.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/components/prism-python.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/components/prism-javascript.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/components/prism-typescript.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/components/prism-bash.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/components/prism-go.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/components/prism-rust.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/components/prism-yaml.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/components/prism-json.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/components/prism-markup.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/components/prism-css.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/components/prism-c.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/components/prism-cpp.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/components/prism-shell-session.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/components/prism-docker.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/components/prism-ini.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/components/prism-sql.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/components/prism-jsx.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/components/prism-tsx.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/components/prism-protobuf.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/components/prism-scss.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/components/prism-markdown.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/components/prism-git.min.js"></script>

    <!-- Mermaid.js -->
    <script src="https://cdnjs.cloudflare.com/ajax/libs/mermaid/10.6.0/mermaid.min.js"></script>

    <script>
    // Mermaid 初始化
    mermaid.initialize({{
        startOnLoad: true,
        theme: 'dark',
        themeVariables: {{
            primaryColor: '#6366f1',
            primaryTextColor: '#f1f5f9',
            primaryBorderColor: '#8b5cf6',
            lineColor: '#94a3b8',
            secondaryColor: '#16162a',
            tertiaryColor: '#0f0f1a'
        }}
    }});

    // 代码复制按钮
    document.querySelectorAll('pre').forEach(function(pre) {{
        var code = pre.querySelector('code');
        if (!code) return;

        // 获取语言
        var langClass = code.className.match(/language-(\\w+)/);
        var lang = langClass ? langClass[1] : '';

        // 创建头部容器
        var header = document.createElement('div');
        header.className = 'code-block-header';

        // 语言标签
        var langLabel = document.createElement('span');
        langLabel.className = 'code-block-lang';
        var langNames = {{
            python: 'Python', javascript: 'JavaScript', typescript: 'TypeScript',
            bash: 'Bash', shell: 'Shell', go: 'Go', rust: 'Rust',
            yaml: 'YAML', json: 'JSON', html: 'HTML', css: 'CSS',
            c: 'C', cpp: 'C++', sql: 'SQL', docker: 'Docker',
            ini: 'INI', text: 'Text', default: 'Code',
            tsx: 'TSX', jsx: 'JSX', protobuf: 'Protobuf',
            scss: 'SCSS', markdown: 'Markdown', gitignore: 'Git',
            git: 'Git'
        }};
        langLabel.textContent = langNames[lang] || langNames['default'];

        // 复制按钮
        var copyBtn = document.createElement('button');
        copyBtn.className = 'code-copy-btn';
        copyBtn.innerHTML = '📋 复制';
        copyBtn.addEventListener('click', function() {{
            var text = code.textContent;
            navigator.clipboard.writeText(text).then(function() {{
                copyBtn.innerHTML = '✅ 已复制';
                copyBtn.classList.add('copied');
                setTimeout(function() {{
                    copyBtn.innerHTML = '📋 复制';
                    copyBtn.classList.remove('copied');
                }}, 2000);
            }}).catch(function() {{
                // fallback
                var textarea = document.createElement('textarea');
                textarea.value = text;
                document.body.appendChild(textarea);
                textarea.select();
                document.execCommand('copy');
                document.body.removeChild(textarea);
                copyBtn.innerHTML = '✅ 已复制';
                copyBtn.classList.add('copied');
                setTimeout(function() {{
                    copyBtn.innerHTML = '📋 复制';
                    copyBtn.classList.remove('copied');
                }}, 2000);
            }});
        }});

        header.appendChild(langLabel);
        header.appendChild(copyBtn);
        pre.insertBefore(header, pre.firstChild);

        // 添加 line-numbers class
        pre.classList.add('line-numbers');
    }});

    // 返回顶部按钮
    var backToTop = document.getElementById('backToTop');
    window.addEventListener('scroll', function() {{
        if (window.scrollY > 300) {{
            backToTop.classList.add('visible');
        }} else {{
            backToTop.classList.remove('visible');
        }}
    }});
    backToTop.addEventListener('click', function() {{
        window.scrollTo({{ top: 0, behavior: 'smooth' }});
    }});

    // TOC 滚动高亮
    var tocLinks = document.querySelectorAll('.toc-sidebar a');
    if (tocLinks.length > 0) {{
        var headings = [];
        tocLinks.forEach(function(link) {{
            var id = link.getAttribute('href').substring(1);
            var el = document.getElementById(id);
            if (el) headings.push({{ el: el, link: link }});
        }});

        window.addEventListener('scroll', function() {{
            var scrollPos = window.scrollY + 120;
            headings.forEach(function(item, i) {{
                var top = item.el.offsetTop;
                var bottom = (i < headings.length - 1) ? headings[i + 1].el.offsetTop : Infinity;
                if (scrollPos >= top && scrollPos < bottom) {{
                    tocLinks.forEach(function(l) {{ l.classList.remove('toc-active'); }});
                    item.link.classList.add('toc-active');
                }}
            }});
        }});
    }}

    // 重新触发 Prism 高亮
    Prism.highlightAll();
    </script>
</body>
</html>"""


def parse_front_matter(text: str) -> tuple:
    """解析 YAML front matter，返回 (metadata_dict, body_text)"""
    match = re.match(r'^---\s*\n(.*?)\n---\s*\n(.*)$', text, re.DOTALL)
    if not match:
        return {}, text
    meta = yaml.safe_load(match.group(1)) or {}
    body = match.group(2)
    return meta, body


def estimate_reading_time(text: str) -> str:
    """估算阅读时间"""
    # 中文约 400字/分钟，英文约 200词/分钟，代码块按3倍计
    chinese_chars = len(re.findall(r'[\u4e00-\u9fff]', text))
    english_words = len(re.findall(r'[a-zA-Z]+', text))
    code_chars = len(re.findall(r'```[\s\S]*?```', text))
    total_time = chinese_chars / 400 + english_words / 200 + code_chars / 300
    minutes = max(1, int(total_time) or 1)
    return f"{minutes} 分钟"


def get_tag_from_categories(categories: list) -> str:
    """从 categories 获取显示标签"""
    if not categories:
        return "技术"
    for cat in categories:
        if cat in CATEGORY_TAG_MAP:
            return CATEGORY_TAG_MAP[cat]
    return categories[0] if categories else "技术"


def format_date(date_val) -> str:
    """格式化日期"""
    if isinstance(date_val, datetime):
        return date_val.strftime("%Y-%m-%d")
    if isinstance(date_val, str):
        # 解析 "2026-04-03 12:00:00 +0800" 格式
        try:
            dt = datetime.strptime(date_val.split("+")[0].strip(), "%Y-%m-%d %H:%M:%S")
            return dt.strftime("%Y-%m-%d")
        except ValueError:
            try:
                dt = datetime.strptime(date_val.strip(), "%Y-%m-%d")
                return dt.strftime("%Y-%m-%d")
            except ValueError:
                return date_val[:10] if len(date_val) >= 10 else date_val
    return str(date_val)[:10]


def build_toc_html(toc_text: str) -> str:
    """从 markdown toc 扩展输出构建 TOC 侧边栏 HTML"""
    if not toc_text or not toc_text.strip():
        return ""

    # 解析 TOC 条目
    entries = []
    for m in re.finditer(r'<a href="#([^"]+)">(.+?)</a>', toc_text):
        href = m.group(1)
        text = re.sub(r'<[^>]+>', '', m.group(2))  # strip HTML tags
        # 确定 heading 层级
        level = "h2"
        before = toc_text[:m.start()]
        if before.rstrip().endswith('</li>'):
            pass
        # 通过检查 TOC 嵌套结构来推断
        li_match = re.findall(r'<li(?: class="[^"]*")?>', toc_text[:m.start()])
        indent = len(li_match)
        if indent <= 1:
            level = "h2"
        elif indent == 2:
            level = "h3"
        else:
            level = "h4"
        entries.append((href, text, level))

    if not entries:
        return ""

    items_html = ""
    for href, text, level in entries:
        items_html += f'<li><a href="#{href}" class="toc-{level}">{text}</a></li>\n'

    return f"""<aside class="toc-sidebar">
    <div class="toc-title">目录</div>
    <ul>
{items_html}
    </ul>
</aside>"""


def convert_markdown_to_html(md_text: str) -> tuple:
    """将 Markdown 转换为 HTML，返回 (content_html, toc_text)"""
    # 配置 markdown 扩展 - 使用标准 fenced_code，让 Prism.js 做语法高亮
    md = markdown.Markdown(
        extensions=[
            TocExtension(toc_depth="2-4", slugify=lambda text, sep: re.sub(r'[^\w\u4e00-\u9fff-]+', sep, text.lower()).strip(sep)),
            "tables",
            FencedCodeExtension(),
            "attr_list",
            "md_in_html",
            "footnotes",
            "abbr",
        ],
    )

    content_html = md.convert(md_text)
    toc_text = md.toc or ""

    return content_html, toc_text


def post_process_html(html: str) -> str:
    """后处理 HTML：添加代码块包装、Mermaid 转换等"""
    # 1. 处理 mermaid 代码块 - 将 <pre><code class="language-mermaid"> 转为 <div class="mermaid">
    def replace_mermaid_block(m):
        code_content = m.group(1)
        # 解码 HTML 实体
        code_content = code_content.replace('&lt;', '<').replace('&gt;', '>').replace('&amp;', '&').replace('&quot;', '"')
        return f'<div class="mermaid">\n{code_content}\n</div>'

    html = re.sub(
        r'<pre><code class="language-mermaid">(.*?)</code></pre>',
        replace_mermaid_block,
        html,
        flags=re.DOTALL
    )

    # 2. 确保所有 <pre><code> 代码块正确包裹
    # 处理没有 language class 的代码块
    html = re.sub(
        r'<pre><code>(.*?)</code></pre>',
        r'<pre><code class="language-text">\1</code></pre>',
        html,
        flags=re.DOTALL
    )

    # 3. 处理图片懒加载
    html = re.sub(
        r'<img([^>]*)>',
        lambda m: '<img' + m.group(1) + ' loading="lazy">' if 'loading=' not in m.group(1) else '<img' + m.group(1) + '>',
        html
    )

    # 4. 给外部链接添加 target="_blank"
    html = re.sub(
        r'<a href="(https?://[^"]+)"(?![^>]*target=)',
        r'<a href="\1" target="_blank" rel="noopener noreferrer"',
        html
    )

    return html


def process_md_file(md_path: str, output_dir: str):
    """处理单个 Markdown 文件，生成 HTML"""
    basename = os.path.basename(md_path)
    out_name = FILENAME_MAP.get(basename)
    if not out_name:
        print(f"  ⚠️  跳过未映射文件: {basename}")
        return

    print(f"  📝 {basename} → {out_name}")

    # 读取文件
    with open(md_path, "r", encoding="utf-8") as f:
        raw = f.read()

    # 解析 front matter
    meta, body = parse_front_matter(raw)
    title = meta.get("title", basename.replace(".md", ""))
    date_val = meta.get("date", "")
    categories = meta.get("categories", [])
    if isinstance(categories, str):
        categories = [categories]
    tags = meta.get("tags", [])
    description = meta.get("description", title)
    last_modified = meta.get("last_modified_at", date_val)

    # 提取文章末尾的更新日期
    update_match = re.search(r'\*最后更新[：:]\s*(.+?)\*', body)
    if update_match:
        last_updated_text = update_match.group(1).strip()
    else:
        last_updated_text = format_date(last_modified) if last_modified else format_date(date_val)

    # 格式化日期
    date_str = format_date(date_val)

    # 获取标签
    tag = get_tag_from_categories(categories)

    # 估算阅读时间
    reading_time = estimate_reading_time(body)

    # 转换 Markdown → HTML
    content_html, toc_text = convert_markdown_to_html(body)

    # 后处理
    content_html = post_process_html(content_html)

    # 构建 TOC
    toc_html = build_toc_html(toc_text)

    # 缩进内容
    content_lines = content_html.split('\n')
    indented_content = '\n'.join('            ' + line for line in content_lines)

    # 生成完整 HTML
    full_html = build_html(
        title=title,
        description=description,
        tag=tag,
        date_str=date_str,
        reading_time=reading_time,
        toc_html=toc_html,
        content_html=indented_content,
        last_updated=last_updated_text,
    )

    # 写入文件
    out_path = os.path.join(output_dir, out_name)
    with open(out_path, "w", encoding="utf-8") as f:
        f.write(full_html)

    print(f"  ✅ 已生成: {out_path}")


def main():
    """主函数：处理所有 Markdown 文件"""
    base_dir = "/tmp/xfengyin-blog"
    posts_dir = os.path.join(base_dir, "_posts")
    output_dir = os.path.join(base_dir, "post")

    os.makedirs(output_dir, exist_ok=True)

    md_files = sorted(glob.glob(os.path.join(posts_dir, "*.md")))
    print(f"🚀 找到 {len(md_files)} 个 Markdown 文件\n")

    for md_path in md_files:
        process_md_file(md_path, output_dir)

    print(f"\n🎉 全部完成！共处理 {len(md_files)} 个文件。")


if __name__ == "__main__":
    main()
