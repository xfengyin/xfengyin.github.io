# xFeng's Tech Blog

基于 Jekyll + Chirpy 主题的个人技术博客。

## 网站地址

🔗 **https://xfengyin.github.io**

## 技术栈

- **生成器**: Jekyll
- **主题**: [Chirpy](https://github.com/cotes2020/jekyll-theme-chirpy)
- **语言**: 中文/English
- **部署**: GitHub Pages

## 本地开发

### 环境要求

- Ruby 3.0+
- Bundler

### 安装依赖

```bash
gem install bundler
bundle install
```

### 启动开发服务器

```bash
bundle exec jekyll s
```

访问 http://localhost:4000

## 目录结构

```
.
├── _posts/          # 博客文章
├── _tabs/           # 独立页面
├── assets/          # 静态资源
├── _config.yml      # 站点配置
└── Gemfile          # 依赖管理
```

## 写作规范

### 文章头部格式

```yaml
---
title: "文章标题"
date: 2026-04-03 09:00:00 +0800
categories: [分类1, 分类2]
tags: [标签1, 标签2, 标签3]
---
```

### 分类建议

- 技术实践
- 硬件测试
- 嵌入式开发
- 行业应用
- 开发工具

### 标签建议

- Rust, Go, Python
- Tauri, React
- 硬件测试
- 嵌入式
- 开源项目

## 部署

推送到 GitHub 后自动部署：

```bash
git add .
git commit -m "添加新文章"
git push origin main
```

## 许可证

本博客内容采用 [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) 许可协议。

---

作者: xFeng | GitHub: [@xfengyin](https://github.com/xfengyin)