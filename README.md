# xfengyin.github.io

Codex 风格个人主页 + 技术博客，基于 **Zola**（Rust 静态站点生成器）构建，部署于 GitHub Pages。

## 技术栈

- **Zola**：Rust 编写的静态站点生成器，单二进制，无 Node / Ruby / Vue
- **Tera 模板 + Markdown**：页面与内容
- **原生 CSS / JS**：Codex 终端风格交互，零前端框架依赖

## 目录结构

```
.
├── config.toml            # Zola 配置
├── content/
│   ├── _index.md          # 主页数据（项目、技能等）
│   └── posts/             # 博客文章
├── templates/             # Tera 模板
├── static/
│   ├── css/codex.css
│   ├── js/codex.js
│   └── assets/img/        # 图片资源
└── .github/workflows/
    ├── pages.yml          # 自动部署到 GitHub Pages
    └── ci.yml             # PR 构建检查
```

## 本地预览

```bash
# 安装 Zola 后执行
zola serve
```

## 部署

推送到 `main` 分支后，GitHub Actions 会自动安装 Zola、执行 `zola build` 并部署到 GitHub Pages。
