# 独立验证报告：视觉层重做（design-critic）

> 作者：design-critic（独立验证员，不参与实现；不修改 templates/ 与 static/）
> 本文件是唯一写入范围。

---

## 0. 方法论与证据链

### 0.1 「旧版」基线的冻结方式（比任务书要求更严一点）

任务书让我直接对 `http://127.0.0.1:8801`（即 `public/`）截图。但 `public/` 是构建产物，
作者随时可以 `zola build` 覆盖它，于是「我截的到底是哪一版」就说不清。所以基线我没有直接截 `public/`：

1. 把当时的 `/vol1/work/xfengyin.github.io/public` **整份复制**到 `/tmp/critic-baseline-public`；
2. 对两份的 **164 个文件逐一 sha256** 比对，结果 **IDENTICAL**（`/tmp/critic-meta/public-baseline.sha256` vs `public-frozen.sha256`）；
3. 另起本地服务 `python3 docs/serve-local.py 8811 --root /tmp/critic-baseline-public`，
   所有基线截图都来自这个**冻结副本**，作者后续怎么改 `public/` 都不会动到我的基线。

基线时刻的源码指纹（`/tmp/critic-meta/source-baseline.sha256`，节选）：

| 文件 | sha256 |
|---|---|
| static/css/chinese.css | `fd2b9a4ddb27afa7b31750157f54a5f5c284ed7d669270d999da56157548541c` |
| static/js/site.js | `c966ebd189b986205e5c43c1a83b8459697bbc04a2b43ef45ce77ca14e0041ac` |
| templates/base.html | `cdda1818a173398739ecd74994b6187f5ac556aa0ee020cf3e036436adbb4078` |
| templates/index.html | `87067f710d568db9017b713074918a74c33270a004d34639420dca269cbaea6b` |
| templates/page.html | `dc860ed92cae3f42cb0f3e12975f998e66b64da3c4e4104c1e7c4ee1b686ded3` |

### 0.2 截图

```
PUPPETEER_CACHE_DIR=/vol2/@appdata/deepseek.harness/home/.cache/puppeteer \
  node docs/shot-pages.cjs http://127.0.0.1:8811 /tmp/critic-before
# -> 截图 32 张 -> /tmp/critic-before
```

我启动这条命令的时间是 16:04:07，而 `docs/shot-pages.cjs` 加入 `tag-single` 的那次修改是 **16:03:41**，
所以第一遍就已经是 32 张（含 `tag-single-*`），与 Lead 16:0x 的通知一致，**无需重跑**。

### 0.3 ⚠️ 两个「观测陷阱」，我先踩了再纠正（后面评新版时同样适用）

1. **整页截图里 fixed 元素的纵向位置不算数。** 站点 CSS 有 `html{scroll-behavior:smooth}`，
   shot-pages.cjs 是「滚到底 → 回顶 → 等 400ms → 截图」。长页面上 400ms 常常没滚回 0，
   于是 `position:fixed` 的顶栏被画在**残留滚动位置**（首页手机版就画在 y≈160）。
   我第一眼据此以为「顶栏压住了 h1 第二行」—— **这是截图假象，不是缺陷**。
   真实几何（`getBoundingClientRect`，390×844，scrollY=0）：toolbar y=0 h=60，h1 y=100 h=108，**不重叠**。
2. **弹幕墙的「半截文字」不是溢出，是滚动动画。** `.danmaku-wall .row span` 是
   `position:absolute; white-space:nowrap; animation: passing`，父级 `overflow:hidden`。
   截图抓到的是动画中间帧，每行文字都在不同相位，所以看起来「被裁掉」。判定前先读了 CSS。

结论：**观测 ≠ 结论**。以下每条都尽量给「可复现的命令 + 机器可读的量」。

---

## 1. 旧版基线：判断清单

### 1.1 真缺陷（有量化证据）

**D1｜文章标题被 nowrap+ellipsis 截断，是真的丢内容。**
`.post-title{white-space:nowrap;text-overflow:ellipsis;overflow:hidden}`（static/css/chinese.css:274-280）。
实测 `scrollWidth > clientWidth` 的卡片标题数量：

| 页面/视口 | 截断标题 / 总数 | 最严重例子 |
|---|---|---|
| 首页 桌面 1440 | **8 / 12** | `Tauri v2 + React 18 跨平台开发实战：XingJu 开发手记` sw=381 cw=272（只剩 71%） |
| /posts/ 桌面 1440 | **12 / 17** | 同上 sw=432 cw=320 |
| 首页 手机 390 | **2 / 12** | 同上 sw=381 cw=328 |
| /posts/ 手机 390 | **8 / 17** | 同上 sw=432 cw=326 |
| /tags/python/ 桌面 | 1 / 1 | `Zen 框架：Python 模块化执行的禅意之道` sw=324 cw=320 |

复现：`node /tmp/critic-meta/diag.cjs <baseUrl>`（读 `truncTitles` 字段）。
**这是「16 项机器检查全过、但用户看不到完整标题」的典型**，也是新版必须回答的第一条。

**D2｜封面图把标题「烧」进图片，而且 12/17 张的烧入标题和文章当前标题对不上。**
封面是构建时生成的 SVG（`static/assets/covers/<slug>.svg`），里面用
`<text font-size="40">` 写死了标题、分类、摘要、品牌名。用 front matter 的 title 比对：
`python3 /tmp/critic-meta/cover-check2.py`（完整输出 `/tmp/critic-meta/cover-drift.txt`）：

- 完全一致：3 张（blog-guide-index、cyberpunk-ui-design、zen-framework）
- 只是当前标题的截断/前缀：2 张（esp32-micropython、xingju-dev-notes）
- **语义已经不同：12 张**，例如

| slug | 图上烧的标题 | 文章现在的标题 |
|---|---|---|
| blog-optimization-notes | 博客优化手记：从部署到**赛博朋克UI改造** | 博客优化手记：从 Jekyll 部署到**中文风格改造** |
| kongming-microservices | Kongming 微服务架构设计：从**八卦**到云原生 | Kongming 微服务架构设计：从**单体**到云原生 |
| mos-gate-resistor | **为什么MOS管的栅极要串接电阻？** | MOS 管栅极电阻的作用与选型：从原理到 PCB 布局 |
| sensor-calibration | 传感器标定与测试：从**原理**到工程实践 | 传感器标定与测试：从**误差分析**到工程实践 |
| oscilloscope-guide | 示波器使用指南：从**入门**到硬件调试实战 | 示波器使用指南：从**基础操作**到硬件调试实战 |
| electric-bike | 电动两轮车技术解析 | 电动两轮车核心技术解析：从系统架构到安全标准 |
| qs03b-test | QS03B硬件及软件逻辑测试 | QS03B 硬件与软件逻辑测试全记录 |
| hardware-test-battery | 硬件测试--电池充放电测试方法 | 电池充放电测试方法与从设备到数据 |
| power-integrity | 电源完整性测试：PDN设计与噪声分析实战 | 电源完整性实战：PDN 设计与噪声分析 |
| gitignore-guide | .gitignore忽略文件配置指南 | .gitignore 配置指南：让你的仓库保持干净 |
| pcb-design-checklist | PCB设计评审checklist… | PCB 设计评审清单与信号完整性测试 |
| wetdry-cleaner-battery-test | 洗地机电池续航测试方法与标准 | 洗地机电池续航测试：方法、标准与数据分析 |

图片里的文字对 16 项检查**完全不可见**：`structure-all-pages.cjs` 只查 `img` 有没有
`alt` 属性（此处 alt 是对的），`check-links.py` 只查路径存在。
于是「封面在展示一个旧标题」这件事，机器永远查不出来。
另外副作用：同一篇文章的标题会**最多出现三次**（hero / 封面图 / h3），视觉冗余。

**D3｜顶栏的信息架构是坏的。**
`templates/base.html` 的 `.toolbar` 是 `display:flex; justify-content:space-between`，
子元素依次是：标题 → `.dark-toggle`（🌙）→ `.menu-toggle`（桌面 `display:none`）→ `.scroll-menu`。
隐藏元素不参与 flex 布局，于是**深色切换按钮被 space-between 推到页面正中间**（实测桌面 x≈540/1440），
与右侧导航割裂。导航本身只有 3 个 emoji 图标项（🏡 首页 / 📒 文章 / 💖 关于）和一个**没有图标**的
GitHub —— 图标风格不统一，且 emoji 依赖系统字体（无 Noto Color Emoji 时会变豆腐块，docs/shot-pages.cjs 里作者自己写过）。

**D4｜手机端首屏内容顶到 fixed 顶栏下面。**
390×844、scrollY=0：`.signature-wall .seal`（「印」）**y=34，高 48**，而 `.toolbar` 固定在 **0–60**。
即首屏第一个内容元素有 26px 处在顶栏背后；截图里「印」就贴在顶栏那一行上（见 `/tmp/critic-view/before/vp-home-mobile.png`）。
不需要它坏，只要用户往下滚一点，顶栏变成 `--maxMaxWhiteMask` 白底毛玻璃（`.toolbar.enter`）就会真的盖住它。

**D5｜弹幕墙给访客的第一印象是「半句话」。**
首屏（scrollY=0）就能看到弹幕墙：5 行 marquee 内容各不相同、相位不同，静止看过去是
「…耀存于心，而非留于形」写得真好。」「AI Agent + Go +」「…待更多文章。」「中文风 + 诗意布局，爱了爱了。」
—— left/right 都被裁断。它是动画不是溢出（见 0.3），但**首屏观感确实像坏了**。
内容本身是自夸式假留言（「大佬666，这个主页太有感觉了！」「已 Star，期待更多文章。」），这是口味问题，我标在 1.2。

**D6｜分类/标签页几乎是一张空页。**
`/categories/` 桌面文档高 **590px**、`/tags/` **786px**（视口 900）：一个 280px 的 hero +
一片 pill + 约 400px 空白 + 页脚。hero 副标题写「共 25 个 **categories**」「共 64 个 **tags**」——
中文页面里混英文残词。`/tags/python/` 更明显：780px 宽的 `.post-list` 居中放**一张**卡片，其余全是空白。

### 1.2 口味问题（我不把它们算作缺陷，但会用来对比新版）

- 配色：深青绿渐变 + 米色（`#1b3b46 → #285b63 → #3f7a80 → #d8d3c4`）在 1080p 上能看到明显 banding；「水墨」意图靠 CSS 渐变硬做。
- hero 的 `::before` 两块深色斜切「山形」：桌面看像两道硬边三角翼/污渍横贯 hero，手机端直接横穿标题（见 `vp-article-mobile.png`）。意图是山峦，观感是几何色块。
- 圆角白方框「印」+ 衬线标题 + 印章红，符号系统堆叠。
- 12px 小字很多（首页桌面 39 个节点是 12px；`/posts/` 51 个），信息密度偏高。
- 卡片：固定 `height:300px`、封面 170px、标题 15px，是 2015 年前后博客模板的典型骨架。
- 分类云 pill 的 hover/焦点状态几乎不可见（只有浅灰底）。

### 1.3 记录为「非缺陷」的假象（避免新版比较时误判）

| 现象 | 真相 |
|---|---|
| 整页图里顶栏跑到页面中段、h1 第二行「消失」 | 见 0.3 #1：smooth-scroll 残留 + fixed 元素绘制位置，**截图假象** |
| 弹幕墙每行文字被裁一半 | 见 0.3 #2：marquee 中间帧，不是溢出 |
| 头像是个空白圆 | `config.extra.avatar` 是 `https://github.com/xfengyin.png`，冻结副本离线加载不到，**离线假象**，不是设计问题 |
| 多张封面看起来是「纯色块」 | 800×480 的 SVG 被 `object-fit:cover` 塞进 2.13:1 的槽位，上下各裁 ~83px；文字在，只是缩放后小字糊了（原图见 `assets/covers/*.svg`） |

### 1.4 「即使 16 项全过、依然难看」的量尺（新版评分标准）

按上面证据，我判定旧版**机器合格但人眼不合格**的地方，按重要性排序，新版必须逐条回答：

1. **D1 标题截断**（真实内容丢失，可测量）—— 新版若仍 `nowrap+ellipsis`，直接算退步。
2. **D2 封面烧字 + 12/17 漂移**（机器查不到，最容易被「重做视觉」忽略）—— 新版要么不再把标题烧进图，要么保证同步。
3. **D5 首屏弹幕半句话** —— 若新版保留弹幕墙，需证明首屏不是「半句话展示」。
4. **D3 顶栏（深色按钮居中、emoji 图标不统一）**。
5. **D4 手机首屏内容顶到 fixed 栏下**。
6. **D6 分类/标签页空心化、中英混杂副标题**。
7. 1.2 的配色 banding、hero 斜切块、12px 小字。

---

## 2. 新版验证（阶段 2）

> 等待 Lead 通知「作者已停手」后再开始：独立重拍 `/tmp/after2` → 真跑 `docs/acceptance.sh` 16 项 →
> 阳性对照（故意注入必然失败）→ 作弊扫描 → 逐页视觉对照。本节占位，结论稍后补齐。



---

## 附录 A：验证工具与准备（阶段 2 将复用）

所有工具都在 `/tmp/critic-meta/`，**不写入仓库**：

| 文件 | 作用 |
|---|---|
| `diag.cjs` | 逐页几何/标题截断/隐藏文本/图片/字号普查（`node diag.cjs <baseUrl> <tag> <outDir?>`） |
| `census.cjs` | **反作弊普查**：可见文本量、隐藏文本与隐藏交互元素、aria-label/alt/role 计数、渐变上的文字数（`node census.cjs <baseUrl> <pagesFile> <out.json> [vps]`） |
| `inject.sh` | 阳性对照：把 public 复制到 `/tmp/inject-*` 并注入必然失败项（contrast / alt），**从不改仓库** |
| `static-scan.py` | 静态模式计数（display:none、opacity:0、aria/alt、emoji、url()…） |
| `cover-check2.py` | 封面烧入标题 vs front matter title 比对（见 D2） |

指纹文件：`source-baseline.sha256`（16:04 的 templates/static 真实基线）、
`public-baseline.sha256` / `public-frozen.sha256`（164 文件，IDENTICAL）、
`pre-docs.sha256` / `pre-config.sha256`（验收脚本与 config.toml 的指纹，用于**检测作者是否动了检查器**）。

### A.1 有两份指纹要分清（我自己纠正过）

- `source-baseline.sha256`（16:04）才是**重做前**的 templates/static 指纹，第 1 节表格引用的是它。
- 另有一份 16:10 的快照被我一度命名为 `pre-src.sha256`；事后发现它**已经包含**作者 16:08 之后的首批
  templates 改动（如 `templates/macros/cards.html`），**不是基线**，已改名为 `snapshot-1610-src.sha256`。
- 因此 A.2 里那次「baseline」静态扫描的 **CSS 部分有效**（`static/css/chinese.css` 当时仍是
  `fd2b9a4d…`，39221 字节），**模板部分无效**（已含作者早期改动）；模板侧的比较改用渲染后 DOM 普查（census）。

### A.2 重做启动的时间证据（说明基线确实冻在改动之前）

- 16:04:07 我在冻结副本上截图；此后 `public/` 从未被我引用。
- `templates/base.html` 16:08:07、`index.html` 16:08:39、`page.html` 16:09:27 被作者改写；
  `static/css/chinese.css` **16:11:19** 由 `fd2b9a4d…`(39221B) 变为 `73836942…`(36697B)。
- 我的基线指纹全部取自 16:04–16:07，因此 before/after 可比。

### A.3 我发现的检查器盲区（阶段 2 要主动去打）

| 检查项 | 盲区 |
|---|---|
| 对比度·浅/深 | 只测**叶子元素**，且背景解析到渐变/图片/半透明就**跳过**（`contrast-all-pages.cjs:30-40`）；把文字放到渐变上即可不被测 |
| 交互目标尺寸 | 先 `filter` 掉 `display:none/visibility:hidden/opacity:0` 的元素（`interactive-all-pages.cjs:64-68`）；隐藏控件即通过 |
| 键盘可达 | `expected` 只枚举**可见**元素；隐藏控件不进清单 |
| HTML 结构 | 只查 `img:not([alt])`，**不查 alt 内容**（`alt=""` 通过） |
| 无 JS 降级 / 打印 | 只要求可见文本 ≥20 字，不比较内容量 |
| 全站无「内容量」基线 | **没有任何一项**比较新旧可见文本量 → 删内容也能全过（census 就是为此写的） |
| viewport/narrow/print 脚本 | `process.exit()` 写在汇总 `console.log` **之前** → 日志里永远没有 ✓/✗ 行（退出码仍正确）。别把「日志没输出」当成「没跑」 |



### A.4 环境陷阱：构建产物里的 CSS/JS 是**生产绝对地址**（阶段 2 口径已改）

Lead 提示、我**独立复核确认**（`grep` + `curl`）：

```
$ grep -o 'href=[^ >]*chinese.css[^ >]*' public/index.html
href="https://xfengyin.github.io/css/chinese.css?h=d3f7683327fe7ebe9dd3"
$ grep -o 'src=[^ >]*site.js[^ >]*' public/index.html
src="https://xfengyin.github.io/js/site.js?h=c966ebd189b986205e5c"
$ grep -o 'src=/assets/covers/[^ >]*' /tmp/critic-baseline-public/index.html | head -1
src=/assets/covers/wetdry-cleaner-battery-test.svg     # 图片是根相对，本地
```

`config.toml` 的 `base_url` 是生产域名，模板用 `get_url()` ⇒ **CSS/JS 是绝对地址、图片是相对地址**。
后果：用 `--root public/` 的朴素服务器打开本地页面时，浏览器会**去线上下载 CSS/JS**，
本地改的样式根本不生效 ——「本地渲染 = 线上旧样式」，任何浏览器类检查都会测到错的样式表。

**对阶段 1 基线的影响（必须披露）**：我的基线截图/普查跑在冻结副本 :8811 上，
同样会去线上取 CSS，所以**基线不是网络自洽的**。它成立的前提是「线上 CSS == 冻结副本里的 CSS」，
我把它当断言验证了：

```
$ curl -sS https://xfengyin.github.io/css/chinese.css | sha256sum
fd2b9a4ddb27afa7b31750157f54a5f5c284ed7d669270d999da56157548541c   (39221 B)
$ sha256sum /tmp/critic-baseline-public/css/chinese.css
fd2b9a4ddb27afa7b31750157f54a5f5c284ed7d669270d999da56157548541c
```

**逐字节相同**，且与冻结 HTML 里的 `?h=fd2b9a4ddb27afa7b317` 缓存戳一致 ⇒ 基线仍然有效。
（同时说明：`public/index.html` 现已是新构建 `?h=d3f76833…`，而线上 CSS 还是旧的 —— 正是这个陷阱的现场。）

**阶段 2 口径**：所有浏览器类检查必须跑**自洽镜像**：
`export PATH="$HOME/bin:$PATH"; zola build -u http://127.0.0.1:8831 -o /tmp/site-review`
自证：`grep -o 'href=[^ >]*chinese.css[^ >]*' /tmp/site-review/index.html` 必须出现 `8831`。
4 个非浏览器项（check-links / content-drift / declared-values / image-quality）读的是
仓库与 `public/`，与 BASE 无关。



---

## 2. 新版验证（阶段 2，2026-10-13 17:00–17:35，作者已停手、写面冻结）

### 2.0 冻结态、自洽镜像与可复现性

冻结态指纹（我独立复核，全部与 Lead 声明一致）：

| 对象 | 值 |
|---|---|
| static/css/chinese.css | 25ba68023c6f201762b3839edf1ff5cd2782e5f841e9a050e78d25a5b1f1cac7 |
| content+templates+static 全树聚合 | d4184fb80e9bd6742bb89594456c6ac6d719566b7f95ccb64039d9766c9074a1 |
| static/js/site.js | c966ebd189b986205e5c43c1a83b8459697bbc04a2b43ef45ce77ca14e0041ac（与基线相同，未改） |
| public/index.html 里的 CSS 缓存戳 | ?h=25ba68023c6f201762b3（= 最终 CSS，说明 public/ 是最终代码的 production-URL 构建） |

docs/ 与基线相比只差 3 个文件，且都是 Lead 声明的改动：

- docs/LOCAL-TESTING.md（新指纹 583f0ac4…，换成 -u/-o 自洽镜像配方）
- docs/acceptance.sh（新指纹 192e810b…，加 preflight 闸）
- docs/print-all-pages.cjs（新指纹 38dbaed3…，把 process.exit 移到文件末尾）

**其余检查器逐字节未变**（对比度 70fe810e…、深色 65a389c6…、CLS 7be6d89f…、结构 dc6ee1fb…、
无JS de6d050a…、交互、键盘、视口、320、reduced-motion 全部 hash 相同）。
⇒ 「为了通过检查而降低对比度判据 / 放宽阈值」这件事**没有发生**。

自洽镜像（浏览器类检查的唯一口径；详见附录 A.4 说明为什么不能直接 serve public/）：

    export PATH="$HOME/bin:$PATH"
    zola build -u http://127.0.0.1:8831 -o /tmp/site-review
    python3 docs/serve-local.py 8831 --root /tmp/site-review

自证（命令与输出）：

    $ grep -o 'href=[^ >]*chinese.css[^ >]*' /tmp/site-review/index.html
    href="http://127.0.0.1:8831/css/chinese.css?h=25ba68023c6f201762b3"
    $ grep -rhoE '(href|src)="https://xfengyin.github.io/[^"]*"' /tmp/site-review/*.html | wc -l
    0
    $ find /tmp/site-review -name '*.html' | wc -l
    111        # 与 /tmp/allpages.txt 的 111 条一致

### 2.1 16 项逐项结论（汇总原文 + 证据）

汇总原文（我的这次运行，BASE=http://127.0.0.1:8831）：

    ════════════ 验收汇总 ════════════
    内部链接 (111 页/407 引用)          ✓ PASS
    内容漂移 (17 篇)                      ✓ PASS
    结构化声明值 (111 页)               ✓ PASS
    axe 全站 (真实 Chrome)                 ✓ PASS
    视口 4 档 (111×4=444)                  ✓ PASS
    320px 超窄屏 (111)                      ✓ PASS
    交互元素目标尺寸 (111)             ✓ PASS
    键盘可达 (111)                         ✓ PASS
    对比度·浅色 (111)                    ✓ PASS
    对比度·深色 (111)                    ✓ PASS
    打印 (111)                               ✓ PASS
    reduced-motion (111)                       ✓ PASS
    CLS 布局偏移 (111)                     ✓ PASS
    HTML 结构+元数据 (111)                ✓ PASS
    无 JS 降级 (111)                        ✓ PASS
    配图质量 (同尺寸 PSNR)              ✓ PASS
    ───────────────────────────────────
      通过 16 / 16   失败 0
    ACCEPTANCE_RC=0

逐项结论（括号里是我从 /tmp/acc-*.log 抄的原始证据）：

1. 内部链接 ✓ — 检查 111 个 HTML，506 条内部引用（旧版 407），无断链。
2. 内容漂移 ✓ — 17 篇，0 处漂移；只有 1 条提示（2024-07-17-hardware-test-battery.md 文件名日期 ≠ front matter 2024-07-13，非问题）。
3. 结构化声明值 ✓ — 检查 111 页，声明值全部有效（JSON-LD 绝对地址、canonical=自身、og:image 存在）。
4. axe 全站 ✓ — 110 页有「违规」但**全部是 AAA 级 color-contrast-enhanced ×7260**（本站对标 AA），AA 级违规 0。
   注意：这条信息很重要 —— 站点满足 AA 但**远不满足 AAA**，属预期。
5. 视口 4 档 ✓ — 111×4=444 次渲染（日志里只有这一行，见 2.6 的工具缺陷）。
6. 320px ✓ — 111 页无横向溢出。
7. 交互元素目标尺寸 ✓ — 但工具自报「未能完整判定 388 个（页尾元素 scrollIntoView 到不了视口中心）」，其中 10 个盒子本身 <24×24。**我用自写探针独立补测了这些**（见 2.4），0 违规。
8. 键盘可达 ✓ — 焦点环缺失 0；应可达但 Tab 到不了 0。
9. 对比度·浅色 ✓ — 实底文本节点 11172 个全过 AA；**因渐变/半透明背景跳过 1122 个**（盲区，见 2.4）。
10. 对比度·深色 ✓ — 11172 个过 AA，1122 跳过；深色下横向溢出无、前景≈背景无。
11. 打印 ✓ — 111 页都有可读内容、无大块深色（含 Lead 说的 .cloud 白纸回归已被修）。
12. reduced-motion ✓ — reduce 下没有任何仍在播放的动画/过渡。
13. CLS ✓ — 最大 CLS 0.0000（390px，滚整页触发懒加载）。
14. HTML 结构+元数据 ✓ — 唯一 title 111、唯一 description 110（404 排除）、重复 id/alt 缺失/h1 数量问题均为 0。
15. 无 JS 降级 ✓ — 但日志写「加载失败 1」，工具不说是哪页（见 2.6）。
16. 配图质量 ✓ — kongming/xingju/zen 三组 400/800/1200 变体 PSNR 35.0–38.6 dB，全部 ≥30。


### 2.2 阳性对照（证明「该报的时候真的会报」）

脚本：/tmp/critic-meta/positive-controls.sh（全部在 /tmp 的一次性构建产物上做，仓库零写入）。原始输出：

**A. preflight 双向对照（Lead 改动，我独立复现，未采信其自测）**

    --- A1 BASE=8801 (public/ 生产绝对地址) 期望 SELF-ERROR ---
    rc=2
    SELF-ERROR: 首页样式表指向 https://xfengyin.github.io/css/chinese.css?h=25ba68023c6f201762b3，与 baseUrl http://127.0.0.1:8801 既不同源也不是根相对。
      ⇒ 这次是在用**线上 CSS** 检查**本地 HTML**，结果没有意义（而且会假绿）。
    verdict lines: 0
    --- A2 BASE=8831 (自洽镜像) 期望放行 ---
    PREFLIGHT-PASS: http://127.0.0.1:8831/css/chinese.css?h=25ba68023c6f201762b3

结论：两个方向都成立。A1 退出码 2、**没有输出任何 PASS/FAIL 行**（证明确实没走 run()、没被记成 FAIL 或 ok）。
A2 放行。另外 A2 的最终证据是我那次完整的 16/16 运行本身 —— 它跑到了汇总，说明 preflight 放行了镜像。

**B. 对比度故障注入（fg == bg）**

    --- B1 清洁镜像 ---
    全站 2 页对比度审计（真实 Chrome）  加载失败 0
    已测实底文本节点: 197   因渐变/半透明未测: 28
    ✓ 所有实底文本均达 WCAG AA
    clean rc=0
    --- B2 注入后（期望 FAIL）---
    全站 2 页对比度审计（真实 Chrome）  加载失败 0
    已测实底文本节点: 197   因渐变/半透明未测: 28
    ✗ 低于 AA 的样式 1 种：
        1.00:1 (需 4.5) 16.5px h3.post-title  出现在 2 页
    injected rc=1

结论：把 .post-title 的前景设成与背景同色（#fff on #fff），该检查立刻报 1.00:1 并 exit 1。
**报警器会响。** 注入是在 zola build 到 /tmp/pc-contrast 的副本上追加 CSS 完成的，仓库没被碰（见 D）。

**C. 打印失败明细（验证 Lead 的「死代码」修复）**

    --- 注入 @media print{ main,.article-card{ display:none !important } } ---
    全站打印审计 2 页（加载失败 0）
    ✗ 打印内容过少 2 页:
        /  打印文本仅 0 字
        /posts/  打印文本仅 0 字
    ✓ 无大块深色（省墨）
    print-injected rc=1

结论：修复有效 —— 失败时会**打印出是哪几页**（旧版这一行是死代码，永远看不到）。同时 rc=1 说明仍然非零退出。

**D. 仓库零改动核对（同一脚本末尾输出）**

    25ba68023c6f201762b3839edf1ff5cd2782e5f841e9a050e78d25a5b1f1cac7  static/css/chinese.css
    d4184fb80e9bd6742bb89594456c6ac6d719566b7f95ccb64039d9766c9074a1  -
    （与 2.0 的冻结指纹完全一致 ⇒ 全部验证动作没有改动站点文件）

### 2.3 反作弊扫描结论（查了，没查到作弊；但有几处要说清）

**a) 检查器有没有被改弱？** —— 没有。
docs/ 里只有 3 个文件变了（都是 Lead 声明的），对比度/深色/结构/CLS/无JS 等判据**逐字节相同**。
我用 sha256 逐文件比对确认它们是**同一份字节**（不是「看起来一样」），
所以 4.5 / 3.0 阈值、只测叶子、渐变跳过这些判据一个字都没动；
也不存在「把文字放到渐变上从而不被测」这种通过检查的**故意**改动。
（注：渐变跳过本身仍是既有盲区，见 2.4 我补测的部分。）

**b) 内容和文字有没有被藏起来？** —— 没有发现真实内容被藏。

- 隐藏文本叶子（我的 census，111 页 × 2 视口）：
  旧 390 = 391，新 390 = 611（+220）；旧 1280 = 171，新 1280 = 170（-1）。
  差异逐选择器定位：**390 的 +220 全部是 span.my-menu**（顶栏导航文字）。
  旧版手机端只藏 4 条导航，新版藏 6 条（新增「分类 / 标签」两项）——即 111 页 × 2 项 = 222，量级吻合。
  1280 的 -1/+109 是同一个「菜单」按钮：旧版文字直接挂在 button 上，新版移到了子 span，计数口径变化，不是新增隐藏。
- 隐藏的可交互元素同理（+220 全是折叠菜单里的链接）。
- display:none / opacity:0 里含 ≥8 个连续字符真实文本的情况：代表页探测结果只有 script 里的搜索索引（假阳性）。
- 新 CSS 里 font-size:0 只出现在 .dark-toggle 一处（注释说明：emoji 文字被 mask 成矢量图标）。

**c) 有没有删掉无障碍标签 / 标题层级？** —— 没有删，但有两处变化要如实说。

    census（111 页）            旧     新
    aria-label                  195    304   （+109：页脚导航 aria-label 等）
    aria-hidden                   2   1014   （+1012：每个装饰性内联 SVG 图标都标了 aria-hidden=true）
    img                         168     47   （-121：17 张「标题卡」SVG 封面被删除 + 卡片不再放装饰图）
    alt 非空                    168     18
    alt 缺失                      0      0   （始终为 0）

- aria-hidden 全部落在「装饰」上：22 处模板里的 aria-hidden 都是内联 SVG 图标或首页/404 的装饰印章（.seal），
  没有一处包住正文。这是正确用法，不是藏内容。
- **alt 非空的真实配图从 168 降到 18 需要解释**：47 张 img 里，装饰性的文章封面现在统一用 alt=""（空），
  只有头像保留了描述性 alt（xfengyin 的头像）。这是标准的「相邻已有同标题文本 ⇒ 封面视为装饰」做法，
  我认可；但它确实是**一次 alt 语义的收缩**，如果将来封面图承担了额外信息，这个 alt="" 就会漏读。
- 标题层级没有降级：h1 恰好 1 个（结构项 + 我自己的代表页探测都确认），h2/h3 仍在。

**d) 有没有把文字做成图片？** —— 新版更少，不是更多。

- 旧版：17 张 static/assets/covers/*.svg 把标题/分类/摘要**烤进图里**，其中 12/17 与 front matter 标题语义不符。
- 新版：这 17 张全部删除（我核对：产物里 0 处 /assets/covers/ 引用，local 请求该路径返回 404；
  atom.xml / sitemap.xml 也无引用）。新增 0 张图内文字资产。
- 新 CSS 里 url() 只有 2 处，都是 --icon-moon / --icon-sun 的 data:image/svg+xml **纯图形 mask**，不含文字。

**e) 「可见文字总量净增长」这个说法成立吗？** —— **成立**，我独立量了。

    census 汇总（111 页）                 旧        新        变化
    innerText 总长 @390                111473   115530     +4057 (+3.6%)
    innerText 总长 @1280               113239   117293     +4054 (+3.6%)
    逐页：108 页增加 / 2 页减少 / 1 页持平

- 减少的 2 页是 /tags/（645 → 605）与 /categories/（287 → 280），原因是药丸里「（2）」这类括号被拆成
  独立的 <em> 元素后 innerText 不再含括号/空格，属**排版变化**。我另外比对了术语集合：
  标签 64 → 64、分类 25 → 25，**集合完全相同，没有丢任何一个**。
- 首页 +394 字（新增真实摘要），/categories/ying-jian-ce-shi/ +120，/tags/ui/ +52 等。
- 弹幕墙那 5 条硬编码假留言确实被整体删除（census 里旧的 danmaku 文本不再出现），
  但净增长仍是 +3.6%，所以「用搜索功能条替换假弹幕」在**文字量**上是净赚的。

**f) 列表页 img 数量下降是「装饰素材减少」还是「正文内容减少」？**

    正文内容：0 减少 —— 文章标题/摘要/日期/字数/分类/标签都在，且比旧版更完整（旧版标题被 nowrap 截断）。
    装饰素材：旧 168 张 img（其中 121 张是列表/卡片里的封面图）→ 新 47 张。
    正文里的真实配图（kongming / xingju-cyberpunk / zen-workflow 三篇的 webp/jpg）**一张没少**，
    配图质量项也仍然对这三组变体做 PSNR 并全部通过。


### 2.4 我主动去打的检查器盲区（这部分是本次验证最独立的价值）

**盲区一：对比度检查会跳过「背景是渐变/图片/半透明」的文字（本轮跳过 1122，占 11172+1122=12294 个文本节点 的 9.1%）。**

补测方法（/tmp/critic-meta/crops.cjs + skip-contrast2.cjs）：把被跳过的文字**设成 color:transparent**
再整页截图，得到这些文字的**纯背景**；按元素矩形裁剪、取中心 50% 区域（-shave 25%）做颜色直方图，
再用 WCAG 公式算「最坏像素对比度」。覆盖 6 个代表页（/、/posts/、/categories/、/tags/、/tags/python/、/404）。

    版本   被测元素   最坏像素对比度不足 AA 的
    旧版      37              9
    新版      27              0

旧版被 16 项验收放过、实际不达标的例子（全部是渐变背景上的文字）：

    1.45:1  a.back-home "← 回到首页"        @/404.html      （渐变底部变亮，白字几乎看不见）
    2.16:1  span "."  品牌橙点 ×5 页                        （橙 #c44507 在青底上，需 3:1）
    4.07:1  div.label "文章"                @/           （浅蓝渐变底 + #6f6f6f）
    4.32:1  p.bio  "From cloud to edge…"    @/
    4.49:1  div.role "AI Systems Engineer…" @/

新版：27 个被测元素全部达标（最低 8.86:1），且旧版那条 404「回到首页」从 1.45:1 变成 9.79:1。

⚠️ 方法论纠偏（我自己踩的）：第一版我用整个元素矩形做直方图，把新版 .seal 的圆角边框像素
也算成「文字背景」，得出「印/失 = 1.74:1」的假缺陷。裁剪缩到中心 50% 后是 8.9:1，
再去看 2 倍截图，白字在深青底上清晰可见。所以这里不把印章算作问题，并把方法写下来备查。

**盲区二：交互目标尺寸工具自报「388 个未能完整判定」，其中 10 个盒子 <24×24。**

补测方法（/tmp/critic-meta/target-size.cjs）：不跳过任何元素，逐个 scrollIntoView（先强制
scroll-behavior:auto，避免平滑滚动导致测到屏幕外），再用 elementFromPoint 在 ±11px 的 25 点网格上采样，
判定实际可点区是否 ≥24×24（旧版用绝对定位 ::after 撑开可点区，只看盒子会误判）。

    8 个代表页（/、/posts/、两篇文章、/categories/、/tags/、/tags/python/、/404）
    版本   盒子 <24 的元素    实际可点区 <24×24
    旧版        71                 0
    新版        18                 0

结论：两个版本都没有真正的 2.5.8 违规（包括工具跳过的页尾元素 Zola / GitHub Pages 链接、
以及新版文章里的 17 个「阅读文章」链接，采样均 25/25 命中）。新版这类小盒子从 71 降到 18，
即可点区更规整。

### 2.5 逐页设计评述：新版是不是真的更好？哪里还不如旧版？

对照方式：/tmp/critic-before（旧，冻结副本）vs /tmp/after2（新，现场镜像），32 张 × 浅/深 × 桌面/移动；
另外用几何量（getBoundingClientRect）与 DOM 量交叉验证。

**明确变好的**

| 页面 | 结论 | 证据 |
|---|---|---|
| 首页（桌面/移动/深色） | 明显更好 | 旧的 V 形伪影、弹幕墙、居中月亮按钮、emoji 图标全部消失；卡片新增真实摘要与字数；导航成组；深浅色观感一致 |
| /posts/ | 大幅更好 | 旧版是「1/3 宽列表 + 两侧大空 + 总高 6120px」，新版 3 列卡片网格、总高 2818px（-54%），17 篇全在 |
| 文章页 | 更好 | 页头从 280px+伪影 变成 134px 的窄 brand 带；总高 15688 降到 13725；多数文章不再叠一张过时封面 |
| /tags/python/ 等 taxonomy_single | 更好 | 卡片从「780px 里偏小一坨」变成整宽卡片，标题不再被截断 |
| /categories/、/tags/ | 更好 | hero 从 280px 缩到约 110–216px；共 25 个categories 改成 共 25 个分类；术语集合不变 |
| 404 | 更好 | 去掉斜切伪影，版式干净（但偏朴素，属可接受） |

**旧版具体缺陷的修复核验（我用几何量独立复测，不采信作者的说法）**

- 标题截断（旧 D1）：旧版首页桌面 8/12、/posts/ 桌面 12/17 截断（Tauri 那条 sw=432 cw=320）。
  新版在 /、/posts/ 桌面、移动、文章页探测，截断列表全为空。✓ 修复。
- 封面烧字 / 12-17 漂移（旧 D2）：17 张 SVG 全删，产物 0 处引用，新增 0 张图内文字。✓ 修复。
- 顶栏信息架构（旧 D3）：月亮按钮不再居中（现在在右侧 toolbar-actions 组内）；emoji 换成内联矢量图标。✓ 修复。
- 手机首屏压在 fixed 栏下（旧 D4）：旧版 390 下 .seal y=34（顶栏 0–60）；新版 y=72（顶栏 0–62）。✓ 修复。
- 弹幕半句话（旧 D5）：整个弹幕墙删除，换成搜索功能条。✓ 修复。
- 分类/标签页空心化（旧 D6）：hero 大幅变矮、副标题中文化。✓ 大部分改善（见下）。

**依然有问题 / 我认为不如旧版或需要再打磨的地方（不只讲好话）**

1. **14 篇无照片文章的封面变成纯 CSS 渐变占位块**（首页与 /posts/ 都能看到）。信息量为零、彼此只靠色相区分，
   观感偏「色卡」。我仍然认为这比旧版「用错标题的图」更好（旧版是静默撒谎的第二份标题），
   但这是新版最弱的一处视觉：可以考虑按分类做低饱和纹理、或放一个首字/序号。
2. **正文全局宋体（--font-serif）是强口味选择**。本机（装了 Noto Serif CJK）截图观感好，
   但在没有中文衬线字体的机器上会落到 generic serif，可能明显变差。我无法在本机验证其他平台，属未验证风险。
3. **深色切换按钮的可访问名实际是 emoji 文本（🌙/☀️）**，图标是 mask，title=切换深浅色 只是 tooltip。
   axe 能过（有文本），但屏幕阅读器会念「月亮/太阳」。建议加 aria-label="切换深浅色"。
4. **模板里还留着 3 个新 CSS 未定义的类名**：span.my-menu（551 次）、a.related-item--fallback（80 次）、
   prev/next（各 17 次）。我逐一查过，它们都能靠父级样式正常显示、不造成可见破损，
   但属于旧设计残留（.my-menu 是旧导航的下划线动画类），建议清掉以免后来者误判。
   语法高亮的 .giallo / .giallo-l 也未定义，但 Zola 用内联 style 着色，实际正常。
5. **对比度盲区的残余风险**：新版我测的 27 个跳过元素全过，但全站共有 1122 个被跳过节点，
   我只覆盖了 6 页 / 37 个唯一选择器。不能宣称全部 1122 个都达标。
6. **axe 有 7260 条 AAA 级 color-contrast-enhanced 提示**（不是失败）。若把目标提到 AAA，全站不达标；
   按 AA 口径是干净的。
7. **打印/深色/无 JS 三条次要路径都通过了**，但我额外看了打印 CSS：它对 pre/span 用了
   color:#1a1a1a !important 的一刀切覆盖（注释写「打印时语法高亮统一压深」）。
   在当前主题下没问题，但以后如果换高亮主题，这行会掩盖真实配色，属可维护性提醒，不是缺陷。

### 2.6 我没做到 / 不确定的部分（不藏）

1. **无 JS 降级项报「加载失败 1」**，而工具不打印是哪一页。我没能查明是哪页，也没能补验那页的无 JS 行为。
   验收因此在这一项上存在 1 页的覆盖空洞（虽然整项 PASS）。
2. 对比度盲区补测只覆盖 6 页 / 37 个唯一选择器（全站 1122 个跳过节点），不是全量。
3. 目标尺寸补测只跑 8 个代表页（旧 71 / 新 18 个小盒子），不是全站 111 页。
4. 没有在真实移动设备或不同操作系统的字体栈下验证（尤其宋体回退与 emoji）；也没有验证 macOS/Windows 上的观感。
5. 视觉对照用的是整页截图；整页截图里 fixed 顶栏的纵向位置会因 html{scroll-behavior:smooth}
   加 400ms 等待而失真（我在 0.3 已记录）。关键结论我都尽量用几何量/元素级证据交叉验证，
   纯靠整页图下的判断我已在文中标注。
6. 没有验证 Atom/sitemap 的内容完整性（只验证了它们不再引用 /assets/covers/，且全站内部链接 0 断链）。
7. 没有跑性能/慢网（不在本次验收范围）。

---

## 附录 B：本次验证的可复现命令

    # 1) 自洽镜像
    export PATH="$HOME/bin:$PATH"
    zola build -u http://127.0.0.1:8831 -o /tmp/site-review
    python3 docs/serve-local.py 8831 --root /tmp/site-review &
    grep -o 'href=[^ >]*chinese.css[^ >]*' /tmp/site-review/index.html   # 必须出现 8831

    # 2) 16 项验收
    bash docs/acceptance.sh http://127.0.0.1:8831 /tmp/allpages.txt

    # 3) 新版截图（32 张）
    PUPPETEER_CACHE_DIR=$HOME/.cache/puppeteer node docs/shot-pages.cjs http://127.0.0.1:8831 /tmp/after2

    # 4) 阳性对照（preflight 双向 / 对比度注入 / 打印注入；仓库零写入）
    bash /tmp/critic-meta/positive-controls.sh

    # 5) 内容与作弊普查（旧 8811 用本地副本拦截外部请求，新 8831 直接跑）
    node /tmp/critic-meta/census3.cjs http://127.0.0.1:8811 /tmp/allpages.txt /tmp/critic-meta/census-old.json 390,1280 /tmp/critic-baseline-public
    node /tmp/critic-meta/census3.cjs http://127.0.0.1:8831 /tmp/allpages.txt /tmp/critic-meta/census-new.json 390,1280
    python3 /tmp/critic-meta/census-delta.py

    # 6) 盲区补测
    node /tmp/critic-meta/crops.cjs http://127.0.0.1:8831 /tmp/critic-meta/crops-new
    node /tmp/critic-meta/skip-contrast2.cjs /tmp/critic-meta/crops-new    # 新版最坏对比度
    node /tmp/critic-meta/target-size.cjs http://127.0.0.1:8831 /tmp/critic-meta/pc-pages8.txt

    # 7) 检查器是否被改弱（与基线指纹比对）
    sha256sum -c /tmp/critic-meta/pre-docs.sha256

### 附：我的最终判定

- 16 项验收 **16/16 全过**，且阳性对照证明这些检查在注入必然失败时真的会报（不是永远绿）。
- 作弊扫描：没有发现通过检查而藏内容/降判据/删无障碍标签/文字图片化的行为；
  减少的是装饰素材与图片里的旧标题，正文内容与术语集合没有减少，可见文字量净增长 +3.6%。
- 设计上：新版确实全面更好，尤其修复了「标题截断、封面烧过时标题、顶栏失序、弹幕半句话、
  分类页中英混杂、手机首屏压栏」这 6 条旧缺陷；深浅色与移动端都成立。
- 新版仍有可改进项（无照片文章的渐变占位、深色开关的可访问名、旧类名残留、宋体回退风险），
  但没有发现会让验收结论失效或该拦而未拦的问题。

---

# 附：Lead 后记（验证冻结之后发生的变更，如实登记）

验证员冻结的站点指纹是 `content+templates+static = d4184fb8…`、`chinese.css = 25ba6802…`。
冻结**之后**，Lead 只做了一处站点文件改动，必须在此登记，否则本报告的指纹与仓库对不上：

| 变更 | 文件 | 理由 |
|---|---|---|
| 给深浅色开关补 `aria-label="深色模式"` | `templates/base.html` | 该按钮的内容是 emoji（site.js 用 textContent 切 🌙/☀️），可访问名因此是一个字符、语义不明。`aria-pressed` 已表达开关状态，故名字用静态值即可（这正是 `aria-pressed` 的标准用法）。 |

变更后实测：
- `templates/base.html = f004a8493ae20c311adc168bf4f66d5800e8a4817edeb9aa34dc9ca65eafc58f`
- 全树 `content+templates+static = c7f3f93c576b547939098afb19ecf4aa6507c1a16866b0de94143bff874885f6`
- `static/css/chinese.css` **未变**（仍 25ba6802…）⇒ 视觉结论与对比度/目标尺寸等结论完全不受影响。
- 浏览器可访问性树复核：按钮名 = `深色模式`，`pressed=false`。
- **在改完之后的产物上重跑整套 `docs/acceptance.sh`：16/16 通过**（自洽镜像 `zola build -u http://127.0.0.1:8851`）。

另外两处**不影响站点、只影响检查器**的改动（同批修掉）：
- `docs/viewport-all-pages.cjs`、`docs/narrow-320-pages.cjs`：与 `print-all-pages.cjs` 同一个
  「`process.exit()` 写在结论 `console.log` 之前 ⇒ 结论是死代码」的缺陷，退出码一律移到文件末尾。
  修后实测三项日志都开始输出 `✓` 结论行（此前只有一行汇总）。
  这正是你报告第 7 节末尾指出的问题；`docs/` 的其余检查器未改动。

> 结论未变：16/16、无作弊、设计全面更好。本节只保证「报告里的指纹」与「仓库里的文件」一一对得上。

