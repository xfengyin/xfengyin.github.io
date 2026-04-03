# xfengyin.github.io

[![GitHub Pages](https://img.shields.io/badge/GitHub-Pages-blue?logo=github&logoColor=white)](https://xfengyin.github.io/)
[![Jekyll](https://img.shields.io/badge/Built%20with-Jekyll-red?logo=jekyll&logoColor=white)](https://jekyllrb.com/)
[![MIT License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![GitHub Stars](https://img.shields.io/github/stars/xfengyin/xfengyin.github.io?style=social)](https://github.com/xfengyin/xfengyin.github.io)

个人技术博客与知识库，基于 Jekyll 构建，部署在 GitHub Pages 上。

## 🚀 功能特性

- **响应式设计**: 适配各种设备屏幕尺寸
- **深色/浅色模式**: 支持主题切换
- **文章分类与标签**: 方便的内容组织
- **代码高亮**: 支持多种编程语言
- **数学公式支持**: 使用 KaTeX 渲染数学公式
- **搜索功能**: 全文搜索支持
- **评论系统**: 支持 Disqus 或 Giscus 评论
- **SEO 优化**: 搜索引擎友好
- **RSS 订阅**: 支持 Atom/RSS 订阅源

## 📁 项目结构

```
xfengyin.github.io/
├── _config.yml          # Jekyll 配置文件
├── _posts/              # 博客文章目录
├── _pages/              # 静态页面
├── _layouts/            # 布局模板
├── _includes/           # 可复用组件
├── _sass/               # SCSS 样式文件
├── assets/              # 静态资源（CSS, JS, 图片等）
├── index.md             # 首页
├── about.md             # 关于页面
├── archive.md           # 归档页面
├── tags.md              # 标签页面
├── LICENSE              # MIT 许可证
├── README.md            # 项目说明
└── .gitignore           # Git 忽略文件
```

## 🚦 快速开始

### 环境要求

- Ruby >= 2.5.0
- RubyGems
- GCC 和 Make

### 本地开发

1. **克隆仓库**
   ```bash
   git clone https://github.com/xfengyin/xfengyin.github.io.git
   cd xfengyin.github.io
   ```

2. **安装依赖**
   ```bash
   bundle install
   ```

3. **启动本地服务器**
   ```bash
   bundle exec jekyll serve
   ```

4. **访问网站**
   打开浏览器访问 [http://localhost:4000](http://localhost:4000)

### 创建新文章

1. 在 `_posts` 目录下创建新的 Markdown 文件，文件名格式为：`YYYY-MM-DD-title.md`
2. 在文件开头添加 YAML 前置信息：
   ```yaml
   ---
   layout: post
   title: "文章标题"
   date: YYYY-MM-DD HH:MM:SS +0800
   categories: [分类1, 分类2]
   tags: [标签1, 标签2]
   ---
   ```
3. 编写文章内容

## 🛠️ 技术栈

- **静态网站生成器**: Jekyll
- **前端框架**: Bootstrap 5
- **代码高亮**: Rouge
- **数学公式**: KaTeX
- **评论系统**: Giscus (基于 GitHub Discussions)
- **图标库**: Font Awesome
- **部署平台**: GitHub Pages

## 📝 写作指南

### 文章格式

- 使用 Markdown 语法
- 图片存放在 `assets/images/` 目录
- 代码块使用三个反引号包裹，并指定语言
- 使用相对链接引用本地资源

### 图片处理

```markdown
![图片描述](/assets/images/example.jpg)
```

### 代码示例

````markdown
```python
def hello_world():
    print("Hello, World!")
```
````

### 数学公式

行内公式：$E = mc^2$

块级公式：
$$
\int_{-\infty}^{\infty} e^{-x^2} dx = \sqrt{\pi}
$$

## 🔧 自定义配置

修改 `_config.yml` 文件来自定义博客设置：

```yaml
# 基本设置
title: "Yin Xinfeng's Blog"
description: "个人技术博客与知识库"
baseurl: ""  # 子目录路径，如果部署在子目录下
url: "https://xfengyin.github.io"  # 网站地址

# 作者信息
author:
  name: "Yin Xinfeng"
  email: "your.email@example.com"
  github: "xfengyin"
  twitter: "your_twitter_handle"

# 主题设置
theme: minima  # 或自定义主题

# 插件
plugins:
  - jekyll-feed
  - jekyll-seo-tag
  - jekyll-sitemap

# 构建设置
markdown: kramdown
highlighter: rouge
```

## 📊 徽章系统

| 徽章 | 说明 | 状态 |
|------|------|------|
| ![GitHub Pages](https://img.shields.io/badge/GitHub-Pages-blue?logo=github&logoColor=white) | GitHub Pages 部署状态 | 自动部署 |
| ![Jekyll](https://img.shields.io/badge/Built%20with-Jekyll-red?logo=jekyll&logoColor=white) | 使用 Jekyll 构建 | 静态生成 |
| ![MIT License](https://img.shields.io/badge/License-MIT-green.svg) | MIT 许可证 | 开源协议 |
| ![GitHub Stars](https://img.shields.io/github/stars/xfengyin/xfengyin.github.io?style=social) | GitHub 星标数 | 社区认可 |

## 🤝 贡献指南

欢迎提交 Issue 和 Pull Request！

1. Fork 本仓库
2. 创建功能分支：`git checkout -b feature/your-feature`
3. 提交更改：`git commit -am 'Add some feature'`
4. 推送到分支：`git push origin feature/your-feature`
5. 提交 Pull Request

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情。

## 📞 联系与支持

- **GitHub Issues**: [报告问题或请求功能](https://github.com/xfengyin/xfengyin.github.io/issues)
- **邮箱**: your.email@example.com
- **博客**: [https://xfengyin.github.io](https://xfengyin.github.io)

## 🙏 致谢

- [Jekyll](https://jekyllrb.com/) - 静态网站生成器
- [GitHub Pages](https://pages.github.com/) - 免费的静态网站托管
- [Minima](https://github.com/jekyll/minima) - Jekyll 默认主题
- 所有贡献者和用户

---

**最后更新**: 2026年4月3日

**维护者**: [Yin Xinfeng](https://github.com/xfengyin)