#!/usr/bin/env python3
"""链接「名副其实」审计（修正版）。

第一版有 4 个解析 bug，全部造成假阳性（100% 误报，比没有更糟）：
  1. id 正则要求首字符是字母 → 漏掉 `#1-dian-chi-xi-tong-bms` 这种以数字开头的
  2. 扫全页 href 当"分类/标签 chip" → 把首页索引页的**标签云**也算进来了
  3. 未处理没有 .article-meta 的页（导航页），它本就没有 chip
  4. 上下篇按"时间序相邻"硬套 → 首篇/末篇本来就只有一边有链接，
     且 `<span class="prev disabled">已经是第一篇</span>` 是**正确**表现

本版修正后只报真实问题。
用法: python3 link-semantics.py [public 目录]
"""
import re
import os
import sys
import glob
from collections import defaultdict

PUB = sys.argv[1] if len(sys.argv) > 1 else '/vol1/work/xfengyin.github.io/public'
issues = []


def read(p):
    return open(p, encoding='utf-8').read()


# ---------- 收集每篇文章页 ----------
posts = {}
for f in sorted(glob.glob(PUB + '/posts/*/index.html')):
    s = read(f)
    slug = f.split('/posts/')[1].split('/')[0]
    # 修正 1：id 允许以数字开头，也允许冒号/点/连字符
    ids = set(re.findall(r'\bid=["\']?([^"\'>\s/]+)', s))
    toc_m = re.search(r'<nav[^>]*class=["\']?toc["\']?[^>]*>(.*?)</nav>', s, re.S)
    toc = re.findall(r'href=["\']?(?:[^"\'\s>]*)#([^"\'\s>]+)', toc_m.group(1)) if toc_m else []
    # 修正 2/3：只取 .article-meta 里的 chip（没有就不取）
    chips = []
    for m in re.finditer(r'<div class=article-meta>(.*?)</div>', s, re.S):
        chips += re.findall(r'href=["\']?([^"\'\s>]+)', m.group(1))
    cats = sorted({u for u in chips if '/categories/' in u})
    tags = sorted({u for u in chips if '/tags/' in u})
    # 上下篇区
    nav_m = re.search(r'<div class=["\']?article-nav["\']?>(.*?)</div>\s*(?:<div|$)', s, re.S)
    nav = nav_m.group(1) if nav_m else ''
    nav_links = re.findall(r'/posts/([a-z0-9-]+)/', nav)
    nav_prev_disabled = '已经是第一篇' in nav
    nav_next_disabled = '已经是最后一篇' in nav
    dm = re.search(r'"datePublished":\s*"([^"]+)"', s)
    posts[slug] = {
        'ids': ids, 'toc': toc, 'cats': cats, 'tags': tags,
        'nav': nav_links, 'prev_disabled': nav_prev_disabled,
        'next_disabled': nav_next_disabled, 'date': dm.group(1) if dm else '',
        'has_chip': bool(chips),
    }

print(f'  文章页: {len(posts)}')

# ---------- ① TOC 锚点 ----------
tot_anchor, bad_toc = 0, []
for slug, p in posts.items():
    for frag in p['toc']:
        tot_anchor += 1
        if frag not in p['ids']:
            bad_toc.append((slug, frag))
print(f'\n  ① TOC 锚点: {tot_anchor} 个，失效 {len(bad_toc)}')
for slug, frag in bad_toc[:8]:
    print(f'      {slug} → #{frag}')
if bad_toc:
    issues.append(f'TOC 锚点失效 {len(bad_toc)}')

# ---------- ②③ chip 目标页是否列出该文章 ----------
def listings(kind):
    out = {}
    for f in glob.glob(f'{PUB}/{kind}/*/index.html'):
        term = f.split(f'/{kind}/')[1].split('/')[0]
        s = read(f)
        out[term] = set(re.findall(r'/posts/([a-z0-9-]+)/', s))
    return out


cat_pages, tag_pages = listings('categories'), listings('tags')
bad_chip = []
for slug, p in posts.items():
    for u in p['cats']:
        term = u.rstrip('/').split('/categories/')[1]
        if slug not in cat_pages.get(term, set()):
            bad_chip.append(('分类', slug, term))
    for u in p['tags']:
        term = u.rstrip('/').split('/tags/')[1]
        if slug not in tag_pages.get(term, set()):
            bad_chip.append(('标签', slug, term))
print(f'\n  ②③ 文章 chip → 目标页未列出该文章: {len(bad_chip)}')
for k, slug, term in bad_chip[:8]:
    print(f'      [{k}] {slug} → {term}')
if bad_chip:
    issues.append(f'chip 目标页缺文章 {len(bad_chip)}')

# ---------- ⑤ 反向：列表页是否多列 ----------
truth_cat, truth_tag = defaultdict(set), defaultdict(set)
for slug, p in posts.items():
    for u in p['cats']:
        truth_cat[u.rstrip('/').split('/categories/')[1]].add(slug)
    for u in p['tags']:
        truth_tag[u.rstrip('/').split('/tags/')[1]].add(slug)
# 修正：只对有 .article-meta 的页面做反向核对。
# blog-guide-index 用自定义模板 blog-guide.html，页面上没有 chip，
# 所以"它出现在分类/标签页里"是正常的，不能算列表页多列。
with_chip = {k for k, v in posts.items() if v['has_chip']}
extra = []
for term, listed in cat_pages.items():
    for slug in (listed & with_chip) - truth_cat.get(term, set()):
        extra.append(('分类', term, slug))
for term, listed in tag_pages.items():
    for slug in (listed & with_chip) - truth_tag.get(term, set()):
        extra.append(('标签', term, slug))
print(f'\n  ⑤ 列表页多列不属于它的文章: {len(extra)}')
for k, term, slug in extra[:8]:
    print(f'      [{k}] {term} 多列 {slug}')
if extra:
    issues.append(f'列表页多列 {len(extra)}')

# ---------- ④ 上下篇（修正 4：首末篇单边为空是正确的）----------
ordered = sorted(posts, key=lambda k: posts[k]['date'])
nav_bad = []
for i, slug in enumerate(ordered):
    p = posts[slug]
    exp_prev = ordered[i - 1] if i > 0 else None
    exp_next = ordered[i + 1] if i < len(ordered) - 1 else None
    exp = {x for x in (exp_prev, exp_next) if x}
    got = set(p['nav'])
    if got != exp:
        nav_bad.append((slug, sorted(exp), sorted(got)))
    # 首篇不该出现"prev"可点链接；末篇不该出现"next"可点链接
    if i == 0 and not p['prev_disabled'] and p['nav']:
        nav_bad.append((slug, ['prev应禁用'], sorted(got)))
    if i == len(ordered) - 1 and not p['next_disabled'] and p['nav']:
        nav_bad.append((slug, ['next应禁用'], sorted(got)))
print(f'\n  ④ 上下篇与时间序不符: {len(nav_bad)}')
for slug, exp, got in nav_bad[:8]:
    print(f'      {slug}  期望 {exp}  实际 {got}')
if nav_bad:
    issues.append(f'上下篇不符 {len(nav_bad)}')

print()
if not issues:
    print('  结论: 链接目标内容与语义一致 ✓')
    sys.exit(0)
print('  结论: ' + '；'.join(issues))
sys.exit(1)