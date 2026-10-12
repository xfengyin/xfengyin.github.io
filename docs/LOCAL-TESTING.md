# 本地验证站点时的关键坑（2026-10-13 实测）

## base_url 必须是本地地址，否则你测的不是自己的改动

`templates/base.html` 用 `get_url(path='css/chinese.css')` 引用样式表，
Zola 会把它展开成 **base_url 拼出来的绝对 URL**。

所以如果你直接 `zola build` 后起 http.server 测试，产物里的 CSS/JS 仍然指向
`https://xfengyin.github.io/...` —— 浏览器加载的是**线上文件**，
你改的本地 CSS **根本没被加载**（表现：改了样式但页面毫无变化，怎么调都没用）。

正确做法：
```bash
cp -r repo /tmp/t && cd /tmp/t
sed -i 's#^base_url = .*#base_url = "http://127.0.0.1:8901/"#' config.toml
/vol1/bin/zola build
cd public && python3 -m http.server 8901 &
node viewport-check.cjs http://127.0.0.1:8901
```
自检：`curl -s http://127.0.0.1:8901/ | grep chinese.css` 应显示**本地**地址。

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
- `check-links.py <repo>` —— 构建产物内部链接检查
- `viewport-check.cjs <baseUrl> [paths...]` —— 多视口渲染检查（溢出/越界/控制台错误/小控件）

（本文件由优化过程产出；viewport-check.cjs 与仓库根目录的 check-links.py 同为验证工具。）
