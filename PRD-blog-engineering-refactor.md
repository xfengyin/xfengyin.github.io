# PRD：博客工程化升级 v2.0

> 产品 / 工程双视角 PRD，承接 [OPTIMIZATION_GUIDE.md](file:///workspace/OPTIMIZATION_GUIDE.md) 的内容优化成果，向"生产可用、可观测、可扩展"演进。
>
> 文档版本：v2.0 · 2026-07-16
> Owner：xFeng · Status：Draft → Review
> 关联代码：[generate_posts.py](file:///workspace/generate_posts.py) · [_config.yml](file:///workspace/_config.yml) · [main.js](file:///workspace/assets/js/main.js) · [main.scss](file:///workspace/_sass/main.scss)

---

## 0. 背景与目标

### 0.1 现状（As-Is）
- 站点基于 **Jekyll 4 + Chirpy 主题**，内容来源 `_posts/*.md`，手工 `bundle exec jekyll build` 推到 GitHub Pages。
- 自研脚本 [generate_posts.py](file:///workspace/generate_posts.py) （918 行单体）从 `_posts/*.md` 二次渲染为 `post/*.html`，独立于 Jekyll 流水线，两条发布链路并存。
- 前端 [main.js](file:///workspace/assets/js/main.js) 用 class 单例 + 闭包 IIFE，约 540 行；SCSS 按 7-1 模式分层但 `post/*.html` 走的是另一套内联 CSS。
- CI：[ci.yml](file:///workspace/.github/workflows/ci.yml) 文件**已被 GBK↔UTF-8 互转破坏**，job 名称为乱码，Workflow 实际可读性 ≈ 0。
- 无测试、无 lint、无 typecheck、无依赖锁定、无可观测性。

### 0.2 目标（To-Be）
将博客升级为**工程化 2.0**：
1. **生产可用**：单条发布流水线、依赖锁定、CI 全绿、零人工介入。
2. **可扩展**：新增文章/新主题/新交互**零改代码**（配置驱动 + 插件化）。
3. **可观测**：构建日志结构化、运行指标采集、异常上报。
4. **可测试**：核心渲染管线 ≥ 80% 覆盖率，关键交互有单测。
5. **安全合规**：XSS 修复、依赖漏洞扫描、内容审计。

### 0.3 非目标
- 不重写 Chirpy 主题。
- 不引入 SSR/SSG 替代品（保持 Jekyll，避免推倒重来）。
- 不做会员/付费/评论增强（评论仍走 Giscus）。
- 不做多语言切换 v1（保留 `lang: zh-CN` 单语）。

---

## 1. 范围与干系人

| 角色 | 关注点 |
|---|---|
| 内容作者（xFeng 本人） | 写 `_posts/*.md` 即可，新增文章零配置 |
| 读者 | 首屏 < 1.5s（4G）、暗色模式、可访问性 |
| 维护者 | 一行命令构建/部署/回滚 |
| 搜索引擎 | SEO、sitemap、结构化数据 |
| 安全审计 | 无敏感信息、无 XSS、无过期依赖 |

---

## 2. 总体架构

```
┌──────────────────────────────────────────────────────────────────────────┐
│                          内容源（_posts/*.md）                            │
└──────────────────────────────────────────────────────────────────────────┘
                │                                            │
                ▼                                            ▼
   ┌──────────────────────────┐                ┌──────────────────────────┐
   │  Python 渲染管线 v2       │                │   Jekyll 4 + Chirpy      │
   │  - 解析 front matter     │                │   - 默认主题渲染         │
   │  - 渲染 Markdown         │                │   - /_site 静态产物      │
   │  - 注入主题/插件         │                └────────────┬─────────────┘
   │  - 产物：post/*.html     │                             │
   └──────────────┬───────────┘                             │
                  │                                         │
                  └────────────┐         ┌─────────────────┘
                               ▼         ▼
                       ┌────────────────────────┐
                       │   统一构建编排          │
                       │   - 依赖校验            │
                       │   - 结构化日志          │
                       │   - trace_id 串联       │
                       │   - 失败熔断            │
                       └────────────┬───────────┘
                                    ▼
                       ┌────────────────────────┐
                       │  /_site  → GitHub Pages │
                       │  + Lighthouse + 监控   │
                       └────────────────────────┘
```

### 2.1 渲染管线分层（取代当前单体脚本）
```
tools/blog/
├── pyproject.toml              # PEP 621 依赖声明 + 工具配置
├── src/blog_engine/
│   ├── __init__.py
│   ├── cli.py                  # Click 入口，参数 + 配置 + 子命令
│   ├── config.py               # pydantic-settings：base_dir / theme / features
│   ├── core/
│   │   ├── discovery.py        # 自动发现 _posts/*.md
│   │   ├── frontmatter.py      # 解析 + 校验 + 默认值
│   │   ├── markdown_render.py  # markdown → HTML，扩展可插拔
│   │   ├── postprocess.py      # 用 lxml/selectolax 改 DOM
│   │   ├── toc.py              # TOC 数据结构 + 渲染
│   │   ├── template.py         # Jinja2 模板（脱离 f-string）
│   │   └── reading_time.py     # 单一职责
│   ├── assets/
│   │   ├── css.py              # SCSS 编译（dart-sass CLI 包装）
│   │   ├── js.py               # ESBuild 打包
│   │   └── prism.py            # 按需收集语言包
│   ├── theme/
│   │   ├── base.html.j2
│   │   ├── post.html.j2
│   │   ├── partials/
│   │   └── tokens/             # 设计 token 单一来源（JSON）
│   ├── plugins/
│   │   ├── mermaid.py          # SPI 注册点
│   │   └── giscus.py
│   ├── observability/
│   │   ├── log.py              # structlog + JSON 输出
│   │   ├── metrics.py
│   │   └── tracing.py          # OpenTelemetry（轻量）
│   └── utils/
│       ├── fs.py
│       └── slug.py
├── tests/
│   ├── unit/
│   ├── integration/
│   └── fixtures/
└── tools/scripts/
    ├── build.sh                # 顶层编排
    ├── lint.sh
    └── pre-commit.sh
```

### 2.2 关键设计原则
- **开闭原则**：新增 Markdown 扩展 = 新增一个 plugin；新增主题 = 新增一个 `theme/<name>/`，主流程零改。
- **依赖倒置**：`markdown_render` 注入 `Parser`/`ExtensionRegistry` 接口，可替换为 mistune / mypyc 加速版。
- **配置驱动**：`blog.toml` 决定主题/语言/插件/输出目录，不改代码即可换皮。
- **可观测**：`structlog` 输出 JSON，每条命令带 `trace_id`，CI 集中采集。
- **幂等**：`discovery → render → write` 全程可重跑，输出 `post/.cache/` 做增量。

---

## 3. 详细功能需求

### FR-1 · 渲染管线 v2

| ID | 描述 | 验收标准 |
|---|---|---|
| FR-1.1 | `blog build` 命令从 `_posts/*.md` 渲染到 `post/*.html` | 新增文章零配置；产物与 Jekyll 渲染的 `_site` 一致性 diff ≤ 0 |
| FR-1.2 | `blog build --watch` 监听文件变化，增量重渲 | 改动 1 篇文章 < 300ms 内完成；CPU 占用 < 5% |
| FR-1.3 | `blog build --dry-run` 仅打印不写盘 | CI 烟雾测试通过 |
| FR-1.4 | 自动 slug 化：`2026-04-03-zen-framework.md` → `zen-framework.html`，并维护 `redirect_from` 旧路径 | 老外链 301 正确 |
| FR-1.5 | 失败熔断：单篇渲染失败不阻塞整体，构建返回非零退出码 + 错误清单 | 注入 1 篇坏文件时 CI 必失败 |
| FR-1.6 | 渲染管线 → Jekyll → Pages 三步原子化编排 | 失败可回滚到上一个 `_site.tar.gz` |

### FR-2 · Front Matter 与内容模型

| ID | 描述 | 验收标准 |
|---|---|---|
| FR-2.1 | 必填字段：`title`、`date`、`categories` | 缺失时 CLI 立即报错并指明文件 |
| FR-2.2 | 选填：`last_modified_at`、`description`、`author`、`image`、`pin`、`tags`、`lang_used` | 默认值符合 OPTIMIZATION_GUIDE |
| FR-2.3 | `lang_used` 数组：列出文章内出现的代码语言，仅打包这些到 Prism | 减少脚本请求 ≥ 60% |
| FR-2.4 | 自动注入：`reading_time`、`word_count`、`hash`（内容指纹，用于增量） | 与历史值偏差 < 5% |
| FR-2.5 | 校验：标题 ≤ 60 字、description ≤ 160 字、`image` 必须存在 | 超限给 warning 而不是 fail |

### FR-3 · 主题与样式系统

| ID | 描述 | 验收标准 |
|---|---|---|
| FR-3.1 | 单一设计 token 源：`theme/tokens/tokens.json`，同时驱动 SCSS 变量与 JS 主题切换 | 改 token 后 SCSS 与 JS 双端同步 |
| FR-3.2 | 内置两套主题：`apple-light`（默认）、`cyberpunk-dark` | 切换主题零代码改动，仅配置 |
| FR-3.3 | 暗色模式跟随系统 `prefers-color-scheme`，可手动覆盖并持久化 | 刷新后保留 |
| FR-3.4 | Critical CSS 内联，非关键 CSS 异步加载 | LCP < 1.2s（Lighthouse mobile） |
| FR-3.5 | 字体子集化：中文按 `categories` 标签动态加载 woff2 | 字体体积减少 ≥ 50% |
| FR-3.6 | 内联 400 行 CSS 从 HTML 中剥离，全部由 SCSS 编译产物提供 | 单页 HTML 大小减少 ≥ 40% |

### FR-4 · 交互与前端

| ID | 描述 | 验收标准 |
|---|---|---|
| FR-4.1 | JS 拆为 ESM：`theme.js` / `scroll.js` / `toc.js` / `copy.js` / `progress.js` / `lazy.js` | 总产物 < 30KB gzip |
| FR-4.2 | `throttle/debounce` 抽到 `utils/fn.js`，仅一份实现 | 单元测试覆盖边界 case |
| FR-4.3 | 代码块复制按钮由 `copy.js` 接管，Prism 钩子统一通过 `data-prismjs-copy` 属性挂载 | 不再在 HTML 模板里写 JS |
| FR-4.4 | TOC 高亮使用 `IntersectionObserver`，替代 `scroll` 事件 | 滚动 60fps，CPU < 3% |
| FR-4.5 | 阅读进度条 + 移动端菜单 + 主题切换 全部走 CSS 变量 | 不出现硬编码十六进制色值 |
| FR-4.6 | 图片懒加载统一走原生 `loading="lazy"` + 渐进增强 | Lighthouse 图像审计满分 |

### FR-5 · 可观测与监控

| ID | 描述 | 验收标准 |
|---|---|---|
| FR-5.1 | 构建日志 JSON 化，含 `trace_id`、`level`、`ts`、`stage`、`file`、`duration_ms` | 任意一行可 grep 出上下文 |
| FR-5.2 | 前端 web-vitals 上报到 `/api/beacon`（用 GitHub Pages 友好的轻方案：Beacon → GoatCounter 自定义事件） | LCP / CLS / INP 上报到 GA4 |
| FR-5.3 | 错误上报：JS 异常 → `window.onerror` + unhandledrejection → Sentry 或自托管 Umami | 每周审阅 |
| FR-5.4 | 构建指标：每篇文章 `render_ms`、总体 `total_ms`、缓存命中率 | 趋势看板可看 |

### FR-6 · 安全与合规

| ID | 描述 | 验收标准 |
|---|---|---|
| FR-6.1 | 所有用户内容（title/description/tag）经 `html.escape(..., quote=True)` | XSS fuzz 测试零命中 |
| FR-6.2 | 外链自动 `rel="noopener noreferrer" target="_blank"` | 0 例外 |
| FR-6.3 | 依赖漏洞扫描：`pip-audit`（Python）+ `npm audit`（JS）每周跑 | 高危 0、中危 < 5 |
| FR-6.4 | `bundle audit` 检查 Gem 漏洞 | 高危 0 |
| FR-6.5 | 敏感信息扫描：仓库内禁止出现真实 `password/token/secret`，CI 失败 | 0 命中 |
| FR-6.6 | Content Security Policy：禁止 inline script，全部 nonce 化 | CSP-Report-Only 阶段 0 拒绝 |

### FR-7 · CI/CD

| ID | 描述 | 验收标准 |
|---|---|---|
| FR-7.1 | UTF-8 修复并重写 [ci.yml](file:///workspace/.github/workflows/ci.yml)，job 名 ASCII | workflow 文件 `file -i` 为 `utf-8` |
| FR-7.2 | jobs：`lint` / `unit` / `build` / `e2e` / `security` / `deploy` | 全部可手动触发 `workflow_dispatch` |
| FR-7.3 | 缓存：`.jekyll-cache`、`pip cache`、`uv cache`、node_modules | CI 总耗时 < 4min |
| FR-7.4 | 部署：main 分支 → GitHub Pages；tag → 触发 `release` 流程 | 失败自动回滚 |
| FR-7.5 | Lighthouse 预算：性能 ≥ 90、a11y ≥ 95、SEO ≥ 95、BP ≥ 100 | 低于阈值 fail |
| FR-7.6 | PR 必须通过：lint + unit + build + e2e + security | 无绿色不能合 |

### FR-8 · 文档与开发者体验

| ID | 描述 | 验收标准 |
|---|---|---|
| FR-8.1 | `docs/CONTRIBUTING.md`：本地开发 5 分钟跑通 | 文档步骤与实际命令一致 |
| FR-8.2 | `docs/ARCHITECTURE.md`：模块图、数据流、扩展点 | 新人 30 分钟上手 |
| FR-8.3 | `docs/THEMING.md`：如何新增主题/插件 | demo 主题可运行 |
| FR-8.4 | `Makefile` 或 `task` 命令：`make dev / test / build / deploy` | 单条命令闭环 |
| FR-8.5 | Pre-commit：`ruff` + `mypy` + `eslint` + `prettier` + `yamllint` | 提交即拦截低级错误 |

---

## 4. 非功能需求

| 类别 | 指标 | 目标值 |
|---|---|---|
| 性能 · 首屏 LCP（4G, Moto G4） | p75 | < 1.5s |
| 性能 · TBT | p75 | < 200ms |
| 性能 · CLS | p75 | < 0.05 |
| 性能 · 单页 HTML 大小 | 平均 | < 60KB |
| 性能 · JS 总体积（gzip） | 全部页面 | < 30KB |
| 性能 · 字体子集化 | 中文 | < 80KB |
| 可用性 | 月度 SLO | 99.9% |
| 可维护性 | 核心渲染单测覆盖率 | ≥ 80% |
| 可维护性 | 平均函数行数 | < 30 |
| 可维护性 | 圈复杂度 | 平均 < 5 |
| 安全 | 依赖高危漏洞 | 0 |
| 兼容 | 浏览器 | Chrome/Edge/Safari/Firefox 最新 2 个版本 |
| 兼容 | 屏幕阅读器 | NVDA + VoiceOver 关键流程通过 |
| 合规 | Cookie | 0（无第三方追踪 cookie） |
| 成本 | Pages 流量 | 月 < 50GB（监控告警阈值 80%） |

---

## 5. 里程碑与排期

| 阶段 | 时间 | 交付物 | 关键指标 |
|---|---|---|---|
| **M0 · 基础修复** | 1 周 | CI UTF-8 修复、`pyproject.toml`、`ruff/mypy` 接入、HTML 转义修复 | CI 绿、零高危 |
| **M1 · 渲染管线 v2** | 2 周 | `blog_engine` 拆分、单测覆盖率 ≥ 60%、增量缓存 | 新增文章零配置 |
| **M2 · 主题统一** | 1.5 周 | tokens 化、CSP 落地、内联 CSS 剥离、字体子集化 | 单页 -40%、LCP < 1.5s |
| **M3 · 前端 ESM** | 1.5 周 | JS 模块化、`IntersectionObserver` TOC、Prism 按需 | JS gzip < 30KB、滚动 60fps |
| **M4 · 可观测** | 1 周 | structlog、web-vitals、错误上报、构建指标看板 | trace_id 端到端 |
| **M5 · 灰度与收尾** | 1 周 | 文档、可访问性审计、Lighthouse 预算、迁移指南 | 所有预算达标 |

总周期约 **8 周**，单人投入 ~ 60% 时间。

---

## 6. 风险与缓解

| 风险 | 等级 | 影响 | 缓解 |
|---|---|---|---|
| Chirpy 主题升级不兼容 | 中 | 主题分裂 | 锁定 `jekyll-theme-chirpy` 版本，CI 升级前跑回归 |
| 旧 `post/*.html` 外链失效 | 中 | SEO 掉分 | `redirect_from` 永久重定向 + sitemap 保留 |
| 字体子集化错配 | 低 | 中文显示缺字 | `font-spider`/`glyphhanger` + 视觉回归 |
| Prism 动态加载首屏闪烁 | 中 | CLS 升高 | 预加载关键语言包 + 占位高度 |
| GitHub Pages 部署时间窗 | 低 | 短暂不可用 | CDN 边缘缓存 + 静默期发布 |
| 个人维护精力 | 中 | 工期延后 | 阶段化交付，每阶段可独立 merge |

---

## 7. 验收口径

- **功能验收**：每条 FR 在 PR 里有对应测试或人工脚本。
- **性能验收**：[lighthouserc.json](file:///workspace/.github/workflows/ci.yml#L182-L187) 阈值硬卡，CI 失败即阻塞。
- **安全验收**：`pip-audit`、`bundle audit`、ZAP baseline 报告归档到 `docs/security/`。
- **文档验收**：按 FR-8 全部产出后做一次"新成员 30 分钟上手"实测。

---

## 8. 开放问题（需 Owner 决策）

1. 是否引入 `uv` 替代 `pip`？  
   - 推荐：是，构建/锁文件更轻。
2. 主题是否在 v1 强制统一为 `apple-light`？  
   - 推荐：默认 `apple-light`，保留 `cyberpunk-dark` 切换开关。
3. 是否接入 GA4 还是仅 GoatCounter？  
   - 推荐：GoatCounter（隐私友好，无 cookie），指标够用。
4. 评论是否继续 Giscus？  
   - 推荐：保持。
5. RSS/Atom 是否在 v2 重做？  
   - 推荐：M2 用 `jekyll-feed` 重构，避免与生成 HTML 冲突。

---

## 9. 附录

### 9.1 现状关键问题一览
- [generate_posts.py](file:///workspace/generate_posts.py) 单体 918 行
- [ci.yml](file:///workspace/.github/workflows/ci.yml) mojibake
- 双设计系统（[main.scss](file:///workspace/_sass/main.scss) vs 内联 CSS）
- [main.js](file:///workspace/assets/js/main.js) 重复 `throttle`
- 无测试 / 无 lint / 无依赖锁

### 9.2 推荐技术栈一览
- **包管理**：`uv`（Python）、`pnpm`（JS）
- **Python**：`click`、`jinja2`、`python-frontmatter`、`markdown`、`selectolax`、`pydantic-settings`、`structlog`
- **JS**：`esbuild`、原生 ESM、Prism（按需）
- **测试**：`pytest` + `pytest-cov` + `hypothesis`（Python）；`vitest` + `@testing-library`（JS）
- **质量**：`ruff` + `mypy --strict` + `eslint` + `stylelint` + `prettier`
- **可观测**：`structlog` + `web-vitals` + `GoatCounter` + `OpenTelemetry`（可选）

### 9.3 不在 v2 范围
- 重写 Chirpy 主题
- 引入 SSR/SSG 替代 Jekyll
- 多语言内容切换
- 会员/付费/订阅
- 站内全文搜索 v2（v1 仍用 Chirpy 自带 lunr）

---

> **变更记录**
> | 版本 | 日期 | 改动 |
> |---|---|---|
> | v2.0 | 2026-07-16 | 初稿，由资深架构师评审产出 |
