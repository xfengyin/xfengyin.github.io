#!/usr/bin/env python3
"""内容漂移检查：找出「手写声明」与「仓库实际」不一致的地方。
这些内容 Zola 不会自动校验，只能靠脚本定期核对。

检查项：
  1. 文章正文里指向本站但不存在的文章链接
  2. 正文里写死的本站绝对地址（应统一用相对路径，否则换域名就断）
  3. 正文里「共 N 篇」这类声明与实际文章数是否一致
  4. front matter 的 image 路径是否存在
  5. 文件名日期与 front matter date 是否一致（仅提示，重命名会改 URL）
用法: python3 content-drift-check.py [repo]
退出码: 0=无问题, 1=有漂移
"""
import re, glob, os, sys

repo = sys.argv[1] if len(sys.argv) > 1 else os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
posts = [f for f in sorted(glob.glob(os.path.join(repo, 'content/posts/*.md')))
         if not f.endswith('_index.md')]
real = {os.path.basename(f)[11:-3] for f in posts}
issues, notes = [], []

for f in posts:
    s = open(f, encoding='utf-8').read()
    fm = s.split('\n+++\n')[0]
    body = s.split('\n+++\n', 2)[-1]
    name = os.path.basename(f)

    for m in re.findall(r'\]\((?:https?://xfengyin\.github\.io)?/posts/([a-z0-9-]+)/', body):
        if m not in real:
            issues.append((name, '正文链接指向不存在的文章', m))
    for m in re.findall(r'\]\((https?://xfengyin\.github\.io[^)]*)\)', body):
        issues.append((name, '正文写死了本站绝对地址', m[:70]))
    for m in re.findall(r'共\s*(\d+)\s*篇', body):
        if int(m) != len(posts):
            issues.append((name, '声明「共 %s 篇」与实际 %d 篇不符' % (m, len(posts)), ''))
    img = re.search(r'^image\s*=\s*"([^"]+)"', fm, re.M)
    if img and not os.path.exists(os.path.join(repo, 'static' + img.group(1))):
        issues.append((name, 'front matter 的 image 文件不存在', img.group(1)))
    d = re.search(r'^date\s*=\s*(\S+)', fm, re.M)
    if d and d.group(1)[:10] != name[:10]:
        notes.append((name, '文件名日期 %s ≠ front matter %s（仅提示：重命名会改 URL）'
                      % (name[:10], d.group(1)[:10])))

print('检查 %d 篇文章' % len(posts))
for n, k, v in issues:
    print('  ✗ %s: %s %s' % (n, k, v))
for n, k in notes:
    print('  · %s: %s' % (n, k))
print('结论: %s' % ('无漂移' if not issues else '%d 处漂移' % len(issues)))
sys.exit(1 if issues else 0)
