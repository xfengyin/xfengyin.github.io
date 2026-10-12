#!/usr/bin/env bash
# 全站验收：一次性跑完所有检查并汇总。
# 用法: bash acceptance.sh <baseUrl> <pagesFile>
set -uo pipefail
BASE="${1:?用法: acceptance.sh <baseUrl> <pagesFile>}"
PAGES="${2:-/tmp/allpages.txt}"
DOCS=/vol1/work/xfengyin.github.io/docs
REPO=/vol1/work/xfengyin.github.io
cd /vol1/work/blog-opt || exit 1

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

echo
echo "════════════ 验收汇总 ════════════"
printf '%s\n' "${LINES[@]}"
echo "───────────────────────────────────"
echo "  通过 $pass / $((pass+fail))   失败 $fail"
echo "  详细输出: /tmp/acc-*.log"
[ $fail -eq 0 ]
