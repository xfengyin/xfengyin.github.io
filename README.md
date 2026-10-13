# xfengyin.github.io

Codex 风格个人主页 + 技术博客，基于 **Zola**（Rust 静态站点生成器）构建，部署于 GitHub Pages。
线上地址：<https://xfengyin.github.io/>

## 技术栈

- **Zola** 0.23.4：Rust 编写的静态站点生成器，单二进制，无 Node / Ruby / Vue
- **Tera 模板 + Markdown**：页面与内容
- **原生 CSS / JS**：Codex 终端风格交互，零前端框架依赖

## 目录结构

```
.
├── config.toml                 # Zola 配置：站点、taxonomies、社交卡片、订阅源
├── content/
│   ├── _index.md               # 主页数据（hero 文案；计数由模板实时统计，不写死）
│   └── posts/                  # 17 篇文章 + _index.md
├── templates/                  # Tera 模板
│   ├── base.html               # 骨架：head / Open Graph / JSON-LD / 顶栏 / 页脚
│   ├── index.html              # 首页（含构建时生成的搜索索引）
│   ├── section.html            # 文章列表 /posts/
│   ├── page.html               # 文章页：进度条、目录、上下篇、推荐阅读；
│   │                           #   带 `guide = true` 时额外注入统计表与标签云
│   ├── taxonomy_list.html      # /categories/ 与 /tags/
│   ├── taxonomy_single.html    # 单个分类 / 标签页
│   ├── 404.html
│   └── atom.xml                # Atom 订阅源模板
├── static/
│   ├── css/chinese.css         # 全站样式（含打印样式与 reduced-motion）
│   ├── js/site.js              # 顶栏 / 菜单 / 深浅色 / 搜索 / 推荐去重 / 代码块可聚焦
│   ├── favicon.ico             # 浏览器自动请求 /favicon.ico 时的兜底
│   └── assets/
│       ├── covers/             # 文章封面 SVG（17，与 slug 同名）
│       ├── diagrams/           # 文章内文示意图 SVG（17）
│       └── img/
│           ├── covers/         # 默认社交卡片图（1）
│           ├── posts/          # 位图配图（3）
│           └── resp/           # 上述位图的响应式 webp（9 = 3 张 × 400/800/1200）
├── docs/                       # 检查与验收脚本（见「质量检查」）
├── .gitea/workflows/           # ci.yml（PR 构建检查）、pages.yml（Gitea 侧占位）
└── .github/workflows/pages.yml # GitHub 侧真正执行构建与发布的那一份
```

## 本地预览

```bash
# 安装 Zola 0.23.4 后执行
zola serve
```

构建：`zola build`，产物输出到 `public/`（已被 `.gitignore` 忽略）。

## 部署

工作流分两处，**两处都需要存在**：

- `.gitea/workflows/ci.yml` —— PR 时在 Gitea 上跑 `zola build` 并校验 `public/index.html`。
- `.gitea/workflows/pages.yml` —— Gitea 侧的占位（各 job 带 `if: github.server_url == 'https://github.com'`，在 Gitea 上只跑 `preflight`）。
- `.github/workflows/pages.yml` —— **GitHub 侧真正执行构建与发布的那一份。**

> ⚠️ **为什么 `.github/workflows/pages.yml` 必须存在**（2026-10-13 实测的坑）
>
> 2026-10-09 的提交曾把 workflow 全部迁到 `.gitea/workflows/`，理由是「GitHub 侧不再跑 Actions」。
> 但本仓库 GitHub Pages 的 `build_type` 是 **`workflow`** —— 它需要一个 GitHub Actions workflow
> 来构建并发布。`.github/workflows/` 空掉之后，**站点就再没有任何部署路径**：
> 推到 `main` 的提交不会出现在线上（当时线上仍是 2026-08-27 的构建）。
> 同时 GitHub 侧的 Actions 开关也是 `disabled` 状态（`/actions/permissions` → `enabled: false`）。
>
> 两个条件缺一不可，排查顺序：
> ```bash
> # 1) Actions 开了吗
> curl -H "Authorization: token $GITHUB_TOKEN" \
>   https://api.github.com/repos/xfengyin/xfengyin.github.io/actions/permissions
> #    enabled:false  -> 开启：
> curl -X PUT -H "Authorization: token $GITHUB_TOKEN" -H 'Content-Type: application/json' \
>   https://api.github.com/repos/xfengyin/xfengyin.github.io/actions/permissions \
>   -d '{"enabled":true,"allowed_actions":"all"}'
> # 2) .github/workflows/pages.yml 在不在 main 上；不在就恢复
> # 3) 看 runs 有没有真的产生（total_count=0 说明没触发）
> ```
>
> 另外：Gitea → GitHub 的 push mirror 偶发 `HTTP 408` 或 `gnutls_handshake() failed`，
> 一般 10 分钟内自愈。若线上迟迟不更新，**先核对 GitHub 侧 main 的 SHA 是否已等于 Gitea 侧**，
> 再怀疑构建本身。

Zola 版本在两处 workflow 中固定为 0.23.4，与本地一致。

## 质量检查（`docs/`）

`docs/` 里是一整套针对本站的检查脚本，全部为「发现问题时退出码非 0」的形式：

| 脚本 | 覆盖 |
|---|---|
| `acceptance.sh` | 一次跑完下面所有项并汇总（16 项 + 可选的配图质量） |
| `check-links.py` | 全站内部链接可达性（111 页 / 400+ 引用） |
| `check-external-links.py` | **站外**链接可达性；区分 404（判失败）、403 机器人拒绝、测不出来 |
| `link-semantics.py` | 链接**落地内容的语义**：TOC 锚点、分类 chip、上下篇顺序、列表页反向一致性 |
| `content-drift-check.py` | front matter 与实际内容 / 文件名的漂移 |
| `declared-values.cjs` | JSON-LD 等「声明值」的有效性（类型与字段是否相符、同页是否重复） |
| `axe-all-pages.cjs` | 真实 Chrome 跑 axe（含 best-practice 规则） |
| `viewport-all-pages.cjs` / `narrow-320-pages.cjs` | 4 档视口 + 320px 超窄屏 |
| `contrast-all-pages.cjs` / `dark-all-pages.cjs` | 浅色 / 深色对比度 |
| `cls-all-pages.cjs` | 累积布局偏移 |
| `interactive-all-pages.cjs` / `kbd-audit-all-pages.cjs` | 交互目标尺寸 / 键盘可达 |
| `structure-all-pages.cjs` / `nojs-all-pages.cjs` / `print-all-pages.cjs` / `reduced-motion-all-pages.cjs` | HTML 结构与元数据 / 无 JS 降级 / 打印 / 减弱动效 |
| `nav-verify.cjs` / `interaction-verify.cjs` | 真的点进去核对落地页与交互 |
| `shot-pages.cjs` | **视觉回归截图**：8 种页面 × 桌面/移动 × 浅色/深色 = 32 张整页图（16 项检查覆盖不到「长得丑」） |
| `serve-local.py` | 带 gzip 的本地静态服务器（贴近线上条件） |

⚠️ 这些脚本目前**带着本机路径**（`/tmp/pptr/node_modules/puppeteer`、
`/tmp/a11y-browser/node_modules/axe-core`、`/vol1/work/...`、`/tmp/allpages.txt`），
只能在开发机上运行；换机器需要先按 `docs/ENVIRONMENT.md` 准备依赖与页面清单。

⚠️ **跑浏览器类检查前必须用自洽镜像** —— 否则测的是线上 CSS。`config.toml` 的 base_url 是生产域名，
产物里的 CSS/JS 因此是绝对地址，直接 `serve public/` 的本地页面会去线上下载样式：
```bash
zola build -u http://127.0.0.1:8901 -o /tmp/site-local
python3 docs/serve-local.py 8901 --root /tmp/site-local
bash docs/acceptance.sh http://127.0.0.1:8901 /tmp/allpages.txt   # 现在会自己拦住不自洽的目标
```
详见 `docs/LOCAL-TESTING.md`。

## 仓库来源

本仓库以自建 Gitea（`http://192.168.31.101:3100/admin/xfengyin.github.io.git`）为唯一源，
GitHub 侧为只读镜像（push mirror 每 10 分钟同步一次）；**请勿直接在 GitHub 提交**。

## 分类与标签（Zola taxonomies）

分类与标签由 Zola 的 `taxonomies` 真实生成，**不是写死的展示文字**：

- 页面：`/categories/`、`/tags/` 以及每个词条一页（如 `/categories/dian-lu-she-ji/`）。
  实测 **25 个分类 / 64 个标签**，sitemap 收录 **110 条 URL**。
- 文章 front matter 里的写法是 **`[taxonomies]` 表**，不是顶层 `categories = [...]`：
  ```toml
  [taxonomies]
  categories = ["前端开发", "UI设计"]
  tags = ["cyberpunk", "ui", "design"]
  ```
  ⚠️ 顶层写法（`categories = [...]` 与 `title`/`date` 同级）**实测不生效** ——
  Zola 不把它当 taxonomy 词条；页面照样构建成功、也不报错，只是不生成分类/标签页。
- 首页的「文章 / 分类 / 标签」三个数字与「分类云」都由模板实时统计
  （`posts.pages | length`、`get_taxonomy(kind="categories").items`），增删文章后**无需手工同步**。

## 已知的内容维护点

- **搜索索引在构建时生成**：`templates/index.html` 的 scripts 块直接从 `posts.pages`
  内联输出 `window.POSTS`。早期有一份手写的 `static/js/search-data.js`，已删除 ——
  手写索引必然与 front matter 漂移（实测 17 篇里有 8 篇**用自己的真实标题搜不到**）。
- `config.toml` 的 `build_search_index` **必须保持 `false`**：Zola 自带搜索索引（tantivy）
  不支持 `zh-CN`，与 `default_language = "zh-CN"` 同时打开会直接构建失败
  （实测报 `Tried to build search index for language zh-CN which is not supported`）。
- `content/posts/2024-12-01-blog-guide-index.md` 是一篇**需要构建时数据**的文章：
  它要输出「总文章数 / 分类数 / 标签数」统计表与按引用次数排序的标签云。
  front matter 里的 `guide = true` 会打开 `templates/page.html` 中对应的两段。
  正文里的系列分组标题（如「硬件测试系列（7篇）」）与条目清单仍是**人工维护**的编辑内容。
  ⚠️ 注意：**Zola 0.23 的内容渲染阶段不能调用 `get_section` / `get_taxonomy`**
  （内容在站点状态就绪前渲染），在 markdown 里写这些函数会直接构建失败
  （实测报 `Section \`posts/_index.md\` not found.`）。要在页面里用这些数据，就得走模板。
  另外 Zola 0.23 **已移除 shortcode 机制**，`templates/shortcodes/` 不再生效。
