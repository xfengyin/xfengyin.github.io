#!/usr/bin/env python3
"""检查 Zola 构建产物里的内部链接/图片是否都存在。
用法: python3 check-links.py [repo_dir]   (默认 /vol1/work/xfengyin.github.io)
退出码: 0=无问题, 1=有断链, 2=用法/环境错误
"""
import re, os, sys, glob

repo = sys.argv[1] if len(sys.argv) > 1 else '/vol1/work/xfengyin.github.io'
pub = os.path.join(repo, 'public')
if not os.path.isdir(pub):
    print(f'ERROR: {pub} 不存在，先跑 zola build', file=sys.stderr); sys.exit(2)

refs, pages = set(), 0
for f in glob.glob(pub + '/**/*.html', recursive=True):
    pages += 1
    s = open(f, encoding='utf-8').read()
    for m in re.finditer(r'(?:src|href)=["\']?(/[^"\'\s>]*)', s):
        u = m.group(1)
        if not u.startswith('//'):
            refs.add((f, u))

missing = []
for f, u in sorted(refs):
    p = u.split('#')[0].split('?')[0]
    if not p or p == '/':
        continue
    c = os.path.join(pub, p.lstrip('/'))
    if not (os.path.exists(c) or os.path.exists(c.rstrip('/') + '/index.html')
            or os.path.exists(os.path.join(pub, p.lstrip('/'), 'index.html'))):
        missing.append((f.replace(pub + '/', ''), u))

print(f'检查 {pages} 个 HTML，{len(refs)} 条内部引用')
for f, u in missing:
    print(f'  断链 {f} -> {u}')
print(f'结论: {"无断链" if not missing else str(len(missing)) + " 处断链"}')
sys.exit(1 if missing else 0)
