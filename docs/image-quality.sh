#!/usr/bin/env bash
# 配图质量检查（固定口径，避免再次出现"三次结论三个样"）
#
# 关键：必须在**变体自身的显示尺寸**上比对。
#   ✗ 拿 400px 变体直接与 1600px 原图比 → 尺寸不匹配，结果无意义
#   ✗ 把变体放大回 1600 再比 → 测的是放大插值损失，不是用户观感
#   ✓ 把原图也缩到该变体尺寸作基准，再与变体比
#
# 用法: bash image-quality.sh [原图目录] [变体目录]
set -uo pipefail
ORIG="${1:-/tmp/img-backup}"
VARS="${2:-/vol1/work/xfengyin.github.io/public/assets/img/resp}"

if [ ! -d "$ORIG" ]; then echo "原图目录不存在: $ORIG（需要备份的原图才能比对）"; exit 2; fi
if [ ! -d "$VARS" ]; then echo "变体目录不存在: $VARS"; exit 2; fi

printf '%-24s %-8s %-10s %s\n' "图片" "变体" "尺寸" "同尺寸 PSNR"
fail=0
for f in "$VARS"/*.webp; do
  base=$(basename "$f" .webp)
  size="${base##*-}"
  name="${base%-*}"
  case "$size" in 400) g=400x225;; 800) g=800x450;; 1200) g=1200x675;; *) continue;; esac
  o="$ORIG/$name.jpg"
  [ -f "$o" ] || { printf '%-24s %-8s %-10s %s\n' "$name" "$size" "-" "(无原图，跳过)"; continue; }
  convert "$o" -resize "$g!" -quality 95 /tmp/_iqref.jpg 2>/dev/null || continue
  p=$(compare -metric PSNR /tmp/_iqref.jpg "$f" null: 2>&1 | head -1)
  # 阈值 30dB（可接受下限）；低于则计为失败
  ok=$(python3 -c "print(1 if float('$p')>=30 else 0)" 2>/dev/null || echo 0)
  [ "$ok" = "1" ] || fail=$((fail+1))
  printf '%-24s %-8s %-10s %s dB %s\n' "$name" "$size" "$g" "$p" "$([ "$ok" = "1" ] && echo '✓' || echo '✗ <30dB')"
done
echo
echo "  评价参考: >40 优秀 / 35-40 良好 / 30-35 可接受 / <30 有可见损失"
echo "  低于 30dB 的变体数: $fail"
exit $([ "$fail" -eq 0 ] && echo 0 || echo 1)
