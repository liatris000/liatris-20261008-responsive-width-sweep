# width-sweep-demo

ブレークポイントの「間」の画面幅でレイアウトが崩れる問題を、幅を掃引して
崩れ始める境界を自動で特定するツールと、意図的に崩れるサンプルページ。

## 構成

- `index.html` — 375 / 768 / 1280px の3点では問題なく見えるが、
  800px〜912px の帯域だけ横スクロールが発生するサンプルページ
- `scripts/sweep.mjs` — Playwright で幅を掃引し、崩れ始める境界を二分探索で特定するスクリプト
- `report.json` — `index.html` に対して実際に `sweep.mjs` を実行した結果

## 使い方

```bash
npm install
npm run serve &        # http://localhost:4173 でサンプルページを配信
npm run sweep           # 320px〜1440px を40px刻みで掃引し、境界を特定する
```

## 判定方法

スクリーンショット差分ではなく、`document.documentElement.scrollWidth > clientWidth`
(横スクロールの発生)と、各要素が `clientWidth` を超えてはみ出していないか
(`getBoundingClientRect().right`)をレイアウト計測値として直接判定する。
ベースライン画像が不要なため、初回の掃引だけで崩れの有無を判定できる。

## 実測結果 (report.json)

| 幅 | 状態 |
|---|---|
| 375px | 問題なし |
| 768px | 問題なし |
| 800px | 崩れ開始 |
| 850px | 崩れている |
| 912px | 崩れ解消 |
| 1280px | 問題なし |

375 / 768 / 1280px の3点だけを確認していると見逃す帯域が、実際に存在する。
