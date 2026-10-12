# xfengyin.github.io

Codex 风格个人主页 + 技术博客，基于 **Zola**（Rust 静态站点生成器）构建，部署于 GitHub Pages。

## 技术栈

- **Zola** 0.23.4：Rust 编写的静态站点生成器，单二进制，无 Node / Ruby / Vue
- **Tera 模板 + Markdown**：页面与内容
- **原生 CSS / JS**：Codex 终端风格交互，零前端框架依赖

## 目录结构

```
.
├── config.toml            # Zola 配置
├── content/
│   ├── _index.md          # 主页数据（文章 / 分类 / 标签计数、hero 文案）
│   └── posts/             # 博客文章（17 篇）
├── templates/             # Tera 模板（base / index / section / page / 404）
├── static/
│   ├── css/chinese.css
│   ├── js/site.js             # 站点交互（导航、深浅色切换）
│   ├── js/search-data.js      # 手工维护的搜索数据，需与文章列表手动同步
│   └── assets/
│       ├── covers/        # 文章封面 SVG（17）
│       ├── diagrams/      # 文章内文示意图 SVG（17）
│       └── img/           # 位图与图标配置（6）：posts/ 文章配图 3、covers/ 默认封面 1、
│                          #   favicons/ 的 browserconfig.xml 与 site.webmanifest 2（非位图）
└── .gitea/workflows/
    ├── pages.yml          # 部署到 GitHub Pages（仅在 github.com 上执行）
    └── ci.yml             # PR 构建检查
```

## 本地预览

```bash
# 安装 Zola 后执行
zola serve
```

构建：`zola build`，产物输出到 `public/`（已被 `.gitignore` 忽略）。

## 部署

工作流分两处，**两处都需要存在**：

- `.gitea/workflows/ci.yml` —— PR 时在 Gitea 上跑 `zola build` 并校验 `public/index.html`。
- `.gitea/workflows/pages.yml` —— Gitea 侧的占位（两个 job 都带 `if: github.server_url == 'https://github.com'`，在 Gitea 上只跑 `preflight`）。
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
> 另外：Gitea → GitHub 的 push mirror 偶发 `HTTP 408`（实测过一次，重试即恢复）。
> 若线上迟迟不更新，先确认 GitHub 侧 `main` 的 SHA 是否已等于 Gitea 侧。

Zola 版本在 workflow 中固定为 0.23.4，与本地一致。

## 仓库来源

本仓库以自建 Gitea（`http://192.168.31.101:3100/admin/xfengyin.github.io.git`）为唯一源，GitHub 侧为只读镜像；请勿直接在 GitHub 提交。

## 分类与标签（Zola taxonomies）

分类与标签由 Zola 的 `taxonomies` 真实生成，**不再是写死的展示文字**：

- 页面：`/categories/`、`/tags/` 以及每个词条一页（如 `/categories/dian-lu-she-ji/`）。
  实测 **25 个分类 / 64 个标签**，sitemap 收录 **110 条 URL**（原来只有 19 条）。
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

- `content/posts/2024-12-01-blog-guide-index.md` 内含一份**手写**的博客统计与文章目录，
  与首页的实时统计不同源，增删文章后仍需手动同步 —— 这是目前**唯一还会漂移的展示数字**。
- `static/js/search-data.js` 是手写的搜索数据，需与文章列表手动同步（当前 17 条，与文章数一致）。
  注意：`config.toml` 的 `build_search_index` **必须保持 `false`** —— Zola 自带的搜索索引（tantivy）
  不支持 `zh-CN`，与 `default_language = "zh-CN"` 同时打开会直接构建失败
  （实测报 `Tried to build search index for language zh-CN which is not supported`）。
  若要改用自带索引，需先把语言配置与前端一起重新评估。
