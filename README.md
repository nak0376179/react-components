# 🧩 JigsawPuzzle

任意のページ（React の子要素）を丸ごと囲んで、表示領域を **ジグソーパズル化** するジョークコンポーネント。
しかもちゃんと遊べます。最初はピースがバラバラに散らばっていて、**ドラッグして元の位置に戻すとカチッとスナップして固定**、
全部はめると「🎉 Clear!」。「🔀 Shuffle」でやり直し、「🧩 Solve」で自動完成。各ピースには縁取り（白ハロー＋濃い線）が付きます。

## しくみ

- 子要素を `rows × cols` 個のレイヤーに複製し、各レイヤーを **SVG `clip-path`（1ピース形状）** で切り抜く
- すべてのレイヤーは同じ内容・同じ位置なので、重ねると元のページに戻る
- 隣り合うピースは **まったく同じ境界カーブを共有** するため、タブ（凸）とブランク（凹）が完全にかみ合う
- 縁取りは各ピースの上に同じパスを2重ストローク（白ハロー＋濃い線）で描画。どんな背景でもピースの形が読める
- ドラッグはポインタイベント、移動は CSS `transform`、浮遊感は `drop-shadow`。ホーム付近で離すと `ZERO` にスナップしてロック

## 使い方

```tsx
import { JigsawPuzzle } from "./JigsawPuzzle";

<JigsawPuzzle rows={4} cols={6}>
  <YourPage />
</JigsawPuzzle>;
```

## Props

| prop        | 型          | 既定値  | 説明                                             |
| ----------- | ----------- | ------- | ------------------------------------------------ |
| `rows`      | `number`    | `4`     | 行数                                             |
| `cols`      | `number`    | `6`     | 列数                                             |
| `active`    | `boolean`    | `true`  | `false` で効果オフ（子要素をそのまま描画）           |
| `scattered` | `boolean`    | `true`  | ゲーム開始時にピースをシャッフル（`false` で完成状態）|
| `draggable` | `boolean`    | `true`  | ピースをドラッグ可能にする                           |
| `controls`  | `boolean`    | `true`  | Shuffle / Solve / 進捗のフローティングバーを表示      |
| `seed`      | `number`     | `1`     | カット形状の乱数シード（変えると切り方が変わる）     |
| `onSolved`  | `() => void` | —       | 全ピースがはまった瞬間に一度だけ呼ばれる             |

## 動かす

```bash
npm install
npm run dev      # http://localhost:5173
```

## 注意（ジョークゆえの割り切り）

- パズルモード中、子要素は複製され `pointer-events: none` になるため、**元ページのクリック操作は無効**になります。実運用ではなく演出用途で。
- 子要素を `rows × cols` 回レンダリングするので、重いページではグリッドを粗めに。

---

# 🥚 その他のジョークコンポーネント

同じ「任意のページを丸ごと囲む」イースターエッグ系の仲間たち。デモは `npm run dev` 上部のタブで切り替えられます。

## 💥 ShatterGlass

ページを囲むと普通に見えますが、**どこかをクリックするとその地点を衝撃点としてガラスのように放射状に割れます**。
破片はドラッグで剥がせて、`💧 Drop` で重力に従って飛び散り、`🔧 Repair` で元通り。割れ方は衝撃点からスポークを放射し、
四隅を必ずスポークに含めることで**隙間なく全面をタイル化**します。各破片は children を `clip-path: polygon()` で切り抜いた複製です。

```tsx
<ShatterGlass spokes={16} rings={4}>
  <YourPage />
</ShatterGlass>
```

| prop | 型 | 既定値 | 説明 |
| ---- | -- | ------ | ---- |
| `active` | `boolean` | `true` | `false` で効果オフ |
| `spokes` | `number` | `16` | 放射スポーク数（4の倍数に丸め） |
| `rings` | `number` | `4` | 衝撃点から端までの同心リング数 |
| `jitter` | `number` | `0.5` | 0–1 のヒビの不規則さ |
| `draggable` | `boolean` | `true` | 破片をドラッグ可能に |
| `controls` | `boolean` | `true` | Repair / Drop バーを表示 |
| `sound` | `boolean` | `true` | 衝撃時にガラス破砕音を合成再生 |
| `onShatter` | `() => void` | — | 最初に割れた瞬間に一度呼ばれる |

## 🎮 CheatCode

子要素は**完全に通常表示**のまま。`↑ ↑ ↓ ↓ ← → ← → B A`（おなじみの隠しコマンド）を入力すると、紙吹雪・虹色シマー・
シークレット内容が解禁されます。`Esc` で閉じる。唯一の副作用は window の `keydown` リスナー1つだけなので、実ページに被せても安全。
コマンド列は `code` prop で好きな配列に差し替え可能です。

```tsx
<CheatCode secret={<MyEasterEgg />} onUnlock={() => console.log("🎮")}>
  <YourPage />
</CheatCode>
```

| prop | 型 | 既定値 | 説明 |
| ---- | -- | ------ | ---- |
| `secret` | `ReactNode` | 既定バナー | 解禁時に表示する中身 |
| `code` | `readonly string[]` | コナミコマンド | キー列（`KeyboardEvent.key`、大小無視） |
| `confetti` | `boolean` | `true` | 解禁時に紙吹雪 |
| `shimmer` | `boolean` | `true` | ページを一瞬虹色に |
| `sound` | `boolean` | `true` | 1-up 風ジングルを合成再生 |
| `sticky` | `boolean` | `false` | 再入力でトグルせず解禁を維持 |
| `onUnlock` | `() => void` | — | コマンド成立ごとに呼ばれる |

## 🟦 Pixelate

ページ全体を **SVG ピクセル化フィルタ**でモザイク表示。canvas や html2canvas を使わず、ライブ DOM に
`filter: url(#…)` を当てるだけ。マウスを乗せると**その下だけ円形にくっきり解除**（曇りガラスを拭く感覚）、
スライダーでブロックサイズ調整、`👓 Reveal` で全面解除。レンズ部分は children を `clip-path: circle()` で切り抜いた鮮明な複製です。

```tsx
<Pixelate size={14} lensRadius={90}>
  <YourPage />
</Pixelate>
```

| prop | 型 | 既定値 | 説明 |
| ---- | -- | ------ | ---- |
| `size` | `number` | `14` | モザイクのブロックサイズ(px) |
| `active` | `boolean` | `true` | `false` で効果オフ |
| `lens` | `boolean` | `true` | ポインタ下を円形に解除 |
| `lensRadius` | `number` | `90` | 解除レンズの半径(px) |
| `controls` | `boolean` | `true` | ブロックサイズ/全面解除バーを表示 |
