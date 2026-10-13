#!/usr/bin/env python3
"""站外链接可达性检查。

为什么需要：docs/check-links.py 只验证**站内**引用（111 页 / 400+ 条），
站外链接从来没有被任何检查覆盖过。2026-10-13 手工扫了一遍才发现
github.com/xfengyin/{XingJu,kongming,zen} 三个仓库链接全是 404 ——
它们从上线起就是死的，而站内检查永远看不到。

分类（**必须区分**，否则会把「测不出来」报成「坏了」）：
  OK     2xx（含跟随重定向后的 2xx）
  DEAD   404 / 410        -> 确定不存在，判失败
  BLOCK  401 / 403 / 429  -> 对方按机器人策略拒绝；真实浏览器可能正常，不计入失败
  其它   5xx / 超时 / DNS / TLS -> ERROR（本次测不出来），不计入失败

退出码：只要有一个 DEAD 就返回 1。

用法:
  python3 check-external-links.py <repoRoot>     # 默认扫 public/ 下的 HTML
  python3 check-external-links.py --self-test    # 用已知好/坏 URL 自检判据
"""
import concurrent.futures as cf
import os
import re
import sys
import urllib.error
import urllib.request
from html.parser import HTMLParser

UA = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36"
TIMEOUT = 25
SELFTEST = [
    ("https://xfengyin.github.io/", "OK"),
    ("https://github.com/xfengyin/kongming-agent", "OK"),
    ("https://github.com/xfengyin/definitely-not-here-xyz", "DEAD"),
]
# 按机器人策略拒绝、且已人工确认页面本身正常的站点：只提示，不判失败
ALLOW_BLOCK = {"www.silabs.com"}


class Links(HTMLParser):
    def __init__(self):
        super().__init__()
        self.urls = []

    def handle_starttag(self, tag, attrs):
        if tag != "a":
            return
        href = dict(attrs).get("href") or ""
        if href.startswith(("http://", "https://")):
            self.urls.append(href)


def collect(root):
    found = {}
    for dirpath, _dirs, files in os.walk(root):
        for name in files:
            if not name.endswith(".html"):
                continue
            path = os.path.join(dirpath, name)
            parser = Links()
            parser.feed(open(path, encoding="utf-8").read())
            for url in parser.urls:
                if url.startswith("https://xfengyin.github.io"):
                    continue  # 站内用绝对地址写的那批，已由 check-links.py 覆盖
                found.setdefault(url, []).append(path)
    return found


def probe(url):
    """返回 (分类, 说明)。先 HEAD，被拒再退回 GET（很多站点不支持 HEAD）。"""
    for method in ("HEAD", "GET"):
        req = urllib.request.Request(url, method=method, headers={"User-Agent": UA})
        try:
            with urllib.request.urlopen(req, timeout=TIMEOUT) as resp:
                return "OK", str(resp.status)
        except urllib.error.HTTPError as e:
            if e.code in (401, 403, 429):
                if method == "HEAD":
                    continue  # HEAD 被拒不代表 GET 也被拒
                return "BLOCK", str(e.code)
            if e.code in (404, 410):
                return "DEAD", str(e.code)
            return "ERROR", "HTTP %s" % e.code
        except Exception as e:  # 超时 / DNS / TLS
            return "ERROR", type(e).__name__
    return "ERROR", "HEAD+GET 都失败"


def self_test():
    bad = 0
    for url, want in SELFTEST:
        got, note = probe(url)
        flag = "✓" if got == want else "✗"
        if got != want:
            bad += 1
        print("  %s %-10s want=%-5s %s  (%s)" % (flag, got, want, url, note))
    print("自检: %s" % ("通过" if not bad else "失败 %d 项" % bad))
    return 1 if bad else 0


def main():
    if "--self-test" in sys.argv:
        return self_test()
    root = os.path.join(sys.argv[1] if len(sys.argv) > 1 else ".", "public")
    if not os.path.isdir(root):
        print("SELF-ERROR 找不到构建产物目录: %s（先跑 zola build）" % root)
        return 2
    found = collect(root)
    if not found:
        print("SELF-ERROR 没有从 %s 里解析出任何站外链接 —— 判据可能已失效" % root)
        return 2
    print("站外链接 %d 个（来自 %s）" % (len(found), root))
    dead, blocked, errored = [], [], []
    with cf.ThreadPoolExecutor(max_workers=8) as pool:
        results = list(pool.map(probe, sorted(found)))
    for url, (verdict, note) in zip(sorted(found), results):
        host = re.sub(r"^https?://", "", url).split("/")[0]
        if verdict == "DEAD":
            dead.append((url, note))
        elif verdict == "BLOCK":
            (blocked if host in ALLOW_BLOCK else dead).append((url, note + " 机器人策略拒绝"))
        elif verdict == "ERROR":
            errored.append((url, note))
        else:
            print("  ok    %s" % url)
    for url, note in blocked:
        print("  BLOCK %s  (%s，已列入白名单)" % (url, note))
    for url, note in errored:
        print("  ERROR %s  (%s，本次测不出来)" % (url, note))
    for url, note in dead:
        print("  DEAD  %s  (%s)" % (url, note))
    print("结论: ok %d / DEAD %d / BLOCK %d / ERROR %d" %
          (len(found) - len(dead) - len(blocked) - len(errored), len(dead), len(blocked), len(errored)))
    if dead:
        for url, _ in dead:
            for page in found[url]:
                print("    %s <- %s" % (url, page))
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
