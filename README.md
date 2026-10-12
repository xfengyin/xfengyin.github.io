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

**工作流位于 `.gitea/workflows/`，不是 `.github/workflows/`。**

- `pages.yml`：推送到 `main` 后，在 **GitHub 侧** 的 runner 上安装 Zola、执行 `zola build` 并部署到 GitHub Pages。该 workflow 的两个 job 都带 `if: github.server_url == 'https://github.com'`，因此在 Gitea 上只跑一个 `preflight` 占位 job，不执行构建与部署。
- `ci.yml`：PR 时执行 `zola build` 并校验 `public/index.html` 存在。

Zola 版本在 workflow 中固定为 0.23.4，与本地一致。

## 仓库来源

本仓库以自建 Gitea（`http://192.168.31.101:3100/admin/xfengyin.github.io.git`）为唯一源，GitHub 侧为只读镜像；请勿直接在 GitHub 提交。

## 已知的内容维护点

- `content/_index.md` 中 `posts_count` / `category_count` / `tag_count` 是**手写的静态数字**，模板直接读取显示（`templates/index.html` 使用 `section.extra.*`），Zola 不会自动计算。新增或删除文章后需同步更新。
- `content/posts/2024-12-01-blog-guide-index.md` 内含一份手写的博客统计与文章目录，同样需要手动同步。
- `static/js/search-data.js` 是手写的搜索数据，需与文章列表手动同步。`config.toml` 已开启 Zola 自带的 `build_search_index`（生成 `search_index.<lang>.js`），但前端目前仍读手写的 `search-data.js`，两者尚未统一。
