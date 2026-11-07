# width-sweep-demo

ブレークポイントの「間」の画面幅でレイアウトが崩れる問題を、幅を掃引して崩れ始める境界を自動で特定するツールと、意図的に崩れるサンプルページ。

記事: https://zenn.dev/liatris/articles/20261008-responsive-width-sweep

## 構成

- `index.html` — 375 / 768 / 1280px の 3 点では問題なく見えるが、800px〜912px の帯域だけ横スクロールが発生するサンプルページ
- `scripts/sweep.mjs` — Playwright で幅を掃引し、崩れ始める境界を二分探索で特定するスクリプト
- `report.json` — `index.html` に対して実際に `sweep.mjs` を実行した結果

## 前提

- Node.js(24.22.1 で確認)
- Playwright と、Playwright 用の Chromium(下の `npx playwright install chromium` で入る)

## 動かし方

```bash
git clone https://github.com/liatris000/liatris-20261008-responsive-width-sweep.git
cd liatris-20261008-responsive-width-sweep
npm install
npx playwright install chromium   # 初回だけ。Playwright 用のブラウザを取得する
npm run serve &                    # http://localhost:4173 でサンプルページを配信
npm run sweep                      # 320px〜1440px を 40px 刻みで掃引し、境界を特定する
```

## 期待される出力

`npm run sweep` の最後に、次が出る。

```text
⚠️  2 件の崩れ境界を検出しました:
  - 崩れ開始: 800px 付近 (aside.insights)
  - 崩れ解消: 912px 付近 (aside.insights)
```

その前に、同じ内容の JSON(`boundaries` に 2 件、`sampleCount: 29`)も出る。

## 判定方法

スクリーンショット差分ではなく、`document.documentElement.scrollWidth > clientWidth`(横スクロールの発生)と、各要素が `clientWidth` を超えてはみ出していないか(`getBoundingClientRect().right`)をレイアウト計測値として直接判定する。ベースライン画像が不要なため、初回の掃引だけで崩れの有無を判定できる。

## 実測結果 (report.json)

| 幅 | 状態 |
|---|---|
| 375px | 問題なし |
| 768px | 問題なし |
| 800px | 崩れ開始 |
| 850px | 崩れている |
| 912px | 崩れ解消 |
| 1280px | 問題なし |

375 / 768 / 1280px の 3 点だけを確認していると見逃す帯域が、実際に存在する。

## 確かめていない範囲

- 試したのは、このリポジトリのサンプルページだけ。実際のサイトでの誤検知(横スクロール前提のカルーセルなど)は確かめていない
- `package-lock.json` を置いていないので、`npm install` で入る Playwright の版は実行した時期で変わる(この README の出力は Playwright 1.65.0 で確認)

## 記事

https://zenn.dev/liatris/articles/20261008-responsive-width-sweep

## ライセンス

MIT
