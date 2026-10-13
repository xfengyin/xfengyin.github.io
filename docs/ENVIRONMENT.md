# 本机环境特性（会影响到 git 与验证工作）

## 1. 文件系统把文件建成 `700`，导致 git 持续报"权限位变更"

现象：`git status` 显示大量 `mode change 100644 => 100755`，但 `git diff` 的
`insertions/deletions` 都是 **0** —— 内容没变，只是可执行位被环境设上了。

实测（2026-10-13）：
```
-rwx------ .gitignore      ← 700
-rwx------ README.md
-rwx------ config.toml
```
而 git 记录的是 `100644`。环境在检出/新建文件时统一给了 `700`。

**处理：**
```bash
git config core.fileMode false
```
这条是**本地配置**（存在 `.git/config`），不要提交到仓库 ——
别的机器上权限位是正常的，关掉反而会掩盖真实的可执行位变化。

**为什么值得记下来：** 我在第 17、26、37 轮都遇到过它，
前两次当成了"我自己 chmod 弄脏的"，花时间排查。
第 37 轮才确认是环境特性。

## 2. `chmod` 的效果不稳定

同一环境下，`chmod 644` 之后 `ls -l` 仍可能显示 `----------`（全 0）。
所以**不要用权限位做任何判断**，包括"这个文件是否可执行"。

## 3. ImageMagick 的限制

- **高度上限 16KP**：超过就 `compare` 报 "missing an image filename"（看着像文件损坏）。
  390×16279 的整页截图会踩到。改用 python 直接解 PNG。
- **无 PDF 支持**（安全策略禁用）：读 PDF 要用 `gs`（ghostscript）转 PNG。

## 4. 本地静态服务器默认不压缩

`python3 -m http.server` **不启用 gzip**，而 GitHub Pages 对 CSS/JS/HTML 都压缩。
实测同一页面在慢 3G 下：本地 20900ms vs 线上 7402ms（差 3 倍）。
**做性能/慢网测试时用 `docs/serve-local.py`**（带 gzip）。

## 5. 可用的浏览器与工具

| 用途 | 路径 |
|---|---|
| Chrome | `~/.cache/puppeteer/chrome/linux-154.0.8037.57` |
| puppeteer | `/tmp/pptr/node_modules/puppeteer` |
| axe-core | `/tmp/a11y-browser/node_modules/axe-core` |
| Zola | `/vol1/bin/zola` (0.23.4) |
