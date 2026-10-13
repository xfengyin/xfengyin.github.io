#!/usr/bin/env bash
# 全站验收：一次性跑完所有检查并汇总。
# 用法: bash acceptance.sh <baseUrl> <pagesFile>
set -uo pipefail
BASE="${1:?用法: acceptance.sh <baseUrl> <pagesFile>}"
PAGES="${2:-/tmp/allpages.txt}"
DOCS=/vol1/work/xfengyin.github.io/docs
REPO=/vol1/work/xfengyin.github.io
cd /vol1/work/blog-opt || exit 1

# ── preflight：local 目标必须自洽，否则整套浏览器检查测的是线上 CSS ──────────────
# 背景（详见 docs/LOCAL-TESTING.md）：config.toml 的 base_url 是生产域名，模板用 get_url()，
# 所以产物里的 CSS/JS 是**绝对地址**。若把 public/ 直接用静态服务器打开，浏览器会去线上取样式 ——
# 「本地改了 CSS」的检查会全绿，却根本没测到改动。2026-10-13 重做视觉层时真的踩到了。
# 因此这里必须**在 run 循环之前**判定并整个脚本退出：
#   SELF-ERROR（退出码 2）既不能记 PASS、也不能记 FAIL —— run() 会把任何非 0 记成 FAIL，故不走 run()。
case "$BASE" in
  *127.0.0.1*|*localhost*|*::1*)
    _base="${BASE%/}"
    _css=$(curl -sS --max-time 20 "$_base/" 2>/dev/null \
           | grep -o 'href="\?[^" >]*chinese\.css[^" >]*' | head -1 | sed 's/^href="\?//')
    if [ -z "$_css" ]; then
      echo "SELF-ERROR: 取不到 $_base/ 的样式表地址（本地站点没起来？）" >&2
      exit 2
    fi
    case "$_css" in
      "$_base"/*) : ;;   # 指向本地同源 —— 自洽
      /*)         : ;;   # 根相对地址，浏览器按页面 origin 解析 —— 同样自洽
      *)
        echo "SELF-ERROR: 首页样式表指向 $_css，与 baseUrl $_base 既不同源也不是根相对。" >&2
        echo "  ⇒ 这次是在用**线上 CSS** 检查**本地 HTML**，结果没有意义（而且会假绿）。" >&2
        echo "  ⇒ 正确做法见 docs/LOCAL-TESTING.md：" >&2
        echo "       zola build -u $_base -o /tmp/site-local" >&2
        echo "       python3 docs/serve-local.py <port> --root /tmp/site-local" >&2
        exit 2 ;;
    esac
    ;;
esac

pass=0; fail=0; declare -a LINES
run() {  # run "名称" 命令...
  local name="$1"; shift
  local out; out=$("$@" 2>&1); local rc=$?
  local verdict
  if [ $rc -eq 0 ]; then verdict="✓ PASS"; pass=$((pass+1)); else verdict="✗ FAIL"; fail=$((fail+1)); fi
  LINES+=("$(printf '%-42s %s' "$name" "$verdict")")
  printf '%s\n' "$out" > "/tmp/acc-$(echo "$name" | tr ' /' '__').log"
}

run "内部链接 (111 页/407 引用)"      python3 "$DOCS/check-links.py" "$REPO"
run "内容漂移 (17 篇)"                 python3 "$DOCS/content-drift-check.py" "$REPO"
run "结构化声明值 (111 页)"            node "$DOCS/declared-values.cjs"
# ⚠️ 这里**不能**写 `cmd1 || cmd2`：那样一旦 cmd1 因「发现违规」返回 1，
# 就会转而执行 cmd2；若 cmd2 返回 0，整项就显示 PASS —— **违规被吞掉**。
# 实测过：造一个含 button-name / image-alt / color-contrast 违规的页面，
# `axe-all-pages || axe-live` 的退出码是 0。所以只跑全站版。
run "axe 全站 (真实 Chrome)"           node "$DOCS/axe-all-pages.cjs" "$BASE"
run "视口 4 档 (111×4=444)"            node "$DOCS/viewport-all-pages.cjs" "$BASE" "$PAGES"
run "320px 超窄屏 (111)"               node "$DOCS/narrow-320-pages.cjs" "$BASE" "$PAGES"
run "交互元素目标尺寸 (111)"           node "$DOCS/interactive-all-pages.cjs" "$BASE" "$PAGES"
run "键盘可达 (111)"                   node "$DOCS/kbd-audit-all-pages.cjs" "$BASE" "$PAGES" 200
run "对比度·浅色 (111)"                node "$DOCS/contrast-all-pages.cjs" "$BASE" "$PAGES"
run "对比度·深色 (111)"                node "$DOCS/dark-all-pages.cjs" "$BASE" "$PAGES"
run "打印 (111)"                       node "$DOCS/print-all-pages.cjs" "$BASE" "$PAGES"
run "reduced-motion (111)"             node "$DOCS/reduced-motion-all-pages.cjs" "$BASE" "$PAGES"
# 以下三项此前不在验收范围（历轮修过相关缺陷，却没纳入例行检查）
run "CLS 布局偏移 (111)"               node "$DOCS/cls-all-pages.cjs" "$BASE" "$PAGES"
run "HTML 结构+元数据 (111)"           node "$DOCS/structure-all-pages.cjs" "$BASE" "$PAGES"
run "无 JS 降级 (111)"                 node "$DOCS/nojs-all-pages.cjs" "$BASE" "$PAGES"
# 配图质量（需要 /tmp/img-backup 里的原图；缺原图时该项跳过并视为通过）
if [ -d /tmp/img-backup ]; then
  run "配图质量 (同尺寸 PSNR)"          bash "$DOCS/image-quality.sh"
fi

echo
echo "════════════ 验收汇总 ════════════"
printf '%s\n' "${LINES[@]}"
echo "───────────────────────────────────"
echo "  通过 $pass / $((pass+fail))   失败 $fail"
echo "  详细输出: /tmp/acc-*.log"
[ $fail -eq 0 ]
