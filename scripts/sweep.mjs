#!/usr/bin/env node
// 幅を掃引してレイアウトが崩れ始める境界幅を特定する。
// 判定はスクリーンショット差分ではなく、DOM のレイアウト計測値で行う
// (ベースライン無しで初回の掃引から判定できるようにするため)。
//
// 使い方:
//   node scripts/sweep.mjs <url> [minWidth] [maxWidth] [coarseStep]
//
// 例:
//   node scripts/sweep.mjs http://localhost:4173/ 320 1440 40

import { chromium } from "playwright";

const TARGET_URL = process.argv[2] || "http://localhost:4173/";
const MIN_WIDTH = parseInt(process.argv[3] || "320", 10);
const MAX_WIDTH = parseInt(process.argv[4] || "1440", 10);
const COARSE_STEP = parseInt(process.argv[5] || "40", 10);

async function checkBreakage(page, width) {
  await page.setViewportSize({ width, height: 900 });
  return page.evaluate(() => {
    const doc = document.documentElement;
    const horizontalOverflow = doc.scrollWidth > doc.clientWidth;

    let elementOverflow = false;
    let overflowingSelector = null;
    for (const el of document.querySelectorAll("body *")) {
      const rect = el.getBoundingClientRect();
      if (rect.width > 0 && rect.right > doc.clientWidth + 1) {
        elementOverflow = true;
        overflowingSelector =
          el.tagName.toLowerCase() +
          (el.className && typeof el.className === "string"
            ? "." + el.className.trim().split(/\s+/).join(".")
            : "");
        break;
      }
    }

    return {
      horizontalOverflow,
      elementOverflow,
      overflowingSelector,
      broken: horizontalOverflow || elementOverflow,
    };
  });
}

// 粗い刻みで壊れ/壊れないの遷移点を探し、そこだけ二分探索で1px単位に詰める。
// 全幅を1pxずつ見ると遅いため、粗掃引→境界だけ二分探索という2段構成にしている。
async function refineBoundary(page, lo, hi, loBroken) {
  while (hi - lo > 1) {
    const mid = Math.floor((lo + hi) / 2);
    const result = await checkBreakage(page, mid);
    if (result.broken === loBroken) {
      lo = mid;
    } else {
      hi = mid;
    }
  }
  return hi;
}

async function main() {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto(TARGET_URL, { waitUntil: "networkidle" });

  const samples = [];
  for (let w = MIN_WIDTH; w <= MAX_WIDTH; w += COARSE_STEP) {
    const result = await checkBreakage(page, w);
    samples.push({ width: w, ...result });
  }
  // 端点 MAX_WIDTH を取りこぼさないようにする
  if (samples[samples.length - 1].width !== MAX_WIDTH) {
    const result = await checkBreakage(page, MAX_WIDTH);
    samples.push({ width: MAX_WIDTH, ...result });
  }

  const boundaries = [];
  for (let i = 1; i < samples.length; i++) {
    const prev = samples[i - 1];
    const curr = samples[i];
    if (prev.broken !== curr.broken) {
      const boundaryWidth = await refineBoundary(page, prev.width, curr.width, prev.broken);
      boundaries.push({
        type: prev.broken ? "崩れ解消" : "崩れ開始",
        from: prev.width,
        to: curr.width,
        boundaryWidth,
        overflowingSelector: curr.broken ? curr.overflowingSelector : prev.overflowingSelector,
      });
    }
  }

  await browser.close();

  const report = {
    targetUrl: TARGET_URL,
    range: { min: MIN_WIDTH, max: MAX_WIDTH, coarseStep: COARSE_STEP },
    boundaries,
    sampleCount: samples.length,
  };

  console.log(JSON.stringify(report, null, 2));

  if (boundaries.length > 0) {
    console.error(`\n⚠️  ${boundaries.length} 件の崩れ境界を検出しました:`);
    for (const b of boundaries) {
      console.error(`  - ${b.type}: ${b.boundaryWidth}px 付近 (${b.overflowingSelector ?? "unknown"})`);
    }
    process.exitCode = 1;
  } else {
    console.error("\n✅ 指定範囲内で崩れは検出されませんでした");
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(2);
});
