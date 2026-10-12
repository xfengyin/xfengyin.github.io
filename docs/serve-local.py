#!/usr/bin/env python3
"""本地静态服务器（**带 gzip**），用于贴近线上条件的性能/慢网测试。

为什么需要它：
  python3 -m http.server **不做压缩**，而 GitHub Pages 对 CSS/JS/HTML 都启用 gzip。
  实测同一页面在"慢 3G"下：
      本地未压缩：CSS 39244B + HTML 58641B  → 首屏可读文本 20.9s
      线上有 gzip：CSS 12803B + HTML  9399B → 首屏可读文本  7.4s
  差了 3 倍。我用未压缩的服务器测过一次慢网，得出"17 秒白屏"的**错误结论**，
  差点据此去优化根本不存在的体积问题。

用法: python3 docs/serve-local.py [port] [--root DIR]
"""
import gzip, http.server, io, os, socketserver, sys

COMPRESSIBLE = ('.html', '.css', '.js', '.svg', '.xml', '.json', '.txt', '.ico')


class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *a, directory=None, **kw):
        super().__init__(*a, directory=directory, **kw)

    def send_head(self):
        path = self.translate_path(self.path)
        if os.path.isdir(path):
            path = os.path.join(path, 'index.html')
        if not os.path.isfile(path):
            return super().send_head()
        if not path.endswith(COMPRESSIBLE):
            return super().send_head()
        accepts_gzip = 'gzip' in (self.headers.get('Accept-Encoding') or '').lower()
        try:
            with open(path, 'rb') as f:
                body = f.read()
        except OSError:
            return super().send_head()
        if accepts_gzip:
            buf = io.BytesIO()
            with gzip.GzipFile(fileobj=buf, mode='wb', compresslevel=6) as gz:
                gz.write(body)
            payload = buf.getvalue()
            self.send_response(200)
            self.send_header('Content-Type', self.guess_type(path))
            self.send_header('Content-Encoding', 'gzip')
            self.send_header('Content-Length', str(len(payload)))
            # 贴近 GitHub Pages
            self.send_header('Cache-Control', 'max-age=600')
            self.end_headers()
            return io.BytesIO(payload)
        self.send_response(200)
        self.send_header('Content-Type', self.guess_type(path))
        self.send_header('Content-Length', str(len(body)))
        self.send_header('Cache-Control', 'max-age=600')
        self.end_headers()
        return io.BytesIO(body)

    def log_message(self, *a):
        pass


def main():
    args = [a for a in sys.argv[1:] if not a.startswith('--')]
    port = int(args[0]) if args else 8000
    root = None
    if '--root' in sys.argv:
        root = sys.argv[sys.argv.index('--root') + 1]

    def factory(*a, **kw):
        return Handler(*a, directory=root, **kw)

    socketserver.TCPServer.allow_reuse_address = True
    with socketserver.ThreadingTCPServer(('127.0.0.1', port), factory) as httpd:
        print(f'  带 gzip 的本地服务: http://127.0.0.1:{port}/  root={root or "当前目录"}')
        httpd.serve_forever()


if __name__ == '__main__':
    main()
