# 本地验证站点时的关键坑（2026-10-13 实测）

## base_url 必须是本地地址，否则你测的不是自己的改动

`templates/base.html` 用 `get_url(path='css/chinese.css')` 引用样式表，
Zola 会把它展开成 **base_url 拼出来的绝对 URL**。

所以如果你直接 `zola build` 后起 http.server 测试，产物里的 CSS/JS 仍然指向
`https://xfengyin.github.io/...` —— 浏览器加载的是**线上文件**，
你改的本地 CSS **根本没被加载**（表现：改了样式但页面毫无变化，怎么调都没用）。

正确做法：**用 zola 自己的参数另建一份自洽镜像**，不要动 `public/`（它是给线上用的、必须是生产 URL）：

```bash
cd /vol1/work/xfengyin.github.io
export PATH="$HOME/bin:$PATH"
rm -rf /tmp/site-local
zola build -u http://127.0.0.1:8901 -o /tmp/site-local     # -u 改 base_url，-o 改输出目录
python3 docs/serve-local.py 8901 --root /tmp/site-local    # 带 gzip，贴近线上
# 之后所有浏览器类检查都指向 http://127.0.0.1:8901
bash docs/acceptance.sh http://127.0.0.1:8901 /tmp/allpages.txt
node docs/shot-pages.cjs http://127.0.0.1:8901 /tmp/after
```

自检（**这一步不能省**）：
```bash
grep -o 'href=[^ >]*chinese.css[^ >]*' /tmp/site-local/index.html
# 必须是 http://127.0.0.1:8901/... —— 若显示 https://xfengyin.github.io/... 就是又踩坑了
```

> 历史注记（2026-10-13 重做视觉层时补）：这份文档早在第 27 轮就写下了这个坑，
> 但当时的做法是「复制整个仓库 + sed config.toml」，太重，于是实际跑验收时仍然
> 直接 serve 了 `public/` —— 等于**浏览器类检查（对比度/CLS/视口/axe）一直在测线上 CSS**。
> 结果只有在「本地 CSS 与线上一致」时才碰巧正确；一旦在部署前改了 CSS，本地全绿而线上未变，
> 检查却什么也发现不了（本轮真的发生了）。
> 现在改用 `-u/-o`（两条命令、零文本改写），并且 `acceptance.sh` 加了 preflight 闸：
> 目标是 localhost 时会先核对首页样式表的 origin，不一致直接 SELF-ERROR，
> 不允许再出现「测了别人的样式却报 ok」。

## 本机有可用的 headless Chrome（此前被误判为"没有"）

`~/.cache/puppeteer/chrome/linux-154.0.8037.57` + `/tmp/pptr/node_modules/puppeteer` 都在，
可以真实渲染、量布局、跑多视口检查、模拟媒体特性：

```bash
cd /tmp/pptr && node -e "require('puppeteer').launch({args:['--no-sandbox']})..."
```

已验证能力：
- 多视口（375/390/768/1280）横向溢出与越界元素检测 → `viewport-check.cjs`
- `emulateMediaFeatures([{name:'prefers-reduced-motion', value:'reduce'}])` 实测动效是否被关掉
- `setCacheEnabled(false)` 避免测到缓存

## 工具

| 脚本 | 用途 | 是否需要浏览器 |
|---|---|---|
| `acceptance.sh <baseUrl> [pagesFile]` | 一次跑完 16 项并汇总（发布前的总闸） | 是 |
| `shot-pages.cjs <baseUrl> <outDir>` | 视觉回归截图：8 种页面 × 桌面/移动 × 浅色/深色 = 32 张整页图 | 是 |
| `axe-all-pages.cjs <baseUrl>` | axe（含 best-practice） | 是 |
| `check-links.py <repo>` | 产物内部链接可达性 | 否 |
| `check-external-links.py <repo>` | **站外**链接（区分 404 / 机器人拒绝 / 测不出来） | 否 |
| `link-semantics.py <repo>` | 链接落地内容的语义（TOC 锚点、chip、上下篇） | 否 |
| `declared-values.cjs` | JSON-LD 等声明值有效性（**读 public/**，所以 public 必须是生产 URL） | 否 |
| `serve-local.py [port] --root DIR` | 带 gzip 的静态服务器（贴近线上） | — |

由于 `declared-values.cjs` 读 `public/`，而浏览器类检查要读自洽镜像，
**两者的 base_url 需求是相反的** —— 所以永远不要把本地镜像写回 `public/`。
做法是 `zola build`（生产）给 public/，`zola build -u ... -o /tmp/site-local`（自洽）给浏览器检查。

（本文件由优化过程产出，随工具增加而更新。）
