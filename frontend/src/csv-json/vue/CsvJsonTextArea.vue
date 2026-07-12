<script setup lang="ts">
// React 版（components/CsvJsonTextArea.tsx）と同じヘッドレスコアを使う Vue 3 実装例。
// 変換・検証のロジックは core/convert.ts に委譲していて、ここは入力と結果表示だけを担う。
import { computed, ref } from "vue"
import {
  convertDelimitedText,
  MAX_ERRORS,
  type ColumnSpec,
  type ConvertResult,
  type OutputFormat,
} from "../core/convert"

const props = withDefaults(defineProps<{ columns: ColumnSpec[]; rows?: number }>(), { rows: 8 })
const emit = defineEmits<{ convert: [result: ConvertResult] }>()

const text = ref("")
const format = ref<OutputFormat>("json")
const result = ref<ConvertResult | null>(null)

const placeholder = computed(
  () =>
    "ここに CSV / TSV を貼り付けてください（1行目はヘッダ）\n例: " +
    props.columns.map((c) => c.label).join(", "),
)

const handleConvert = () => {
  const next = convertDelimitedText(text.value, props.columns, format.value)
  result.value = next
  emit("convert", next)
}

const copyOutput = () => {
  if (result.value?.ok) navigator.clipboard.writeText(result.value.output)
}
</script>

<template>
  <div class="csv-json">
    <textarea v-model="text" :rows="rows" :placeholder="placeholder" aria-label="CSV/TSV 入力" />
    <div class="controls">
      <button type="button" class="convert" @click="handleConvert">変換</button>
      <label><input v-model="format" type="radio" value="json" /> JSON</label>
      <label><input v-model="format" type="radio" value="csv" /> CSV</label>
    </div>

    <div v-if="result && !result.ok" class="errors" role="alert">
      <strong>
        エラーが {{ result.errors.length }}{{ result.errors.length >= MAX_ERRORS ? "件以上" : "件" }} あります
      </strong>
      <ul>
        <li v-for="(e, i) in result.errors" :key="i">{{ e.message }}</li>
      </ul>
    </div>

    <div v-else-if="result?.ok">
      <div class="result-head">
        <strong>変換結果（{{ result.rows.length }}件）</strong>
        <button type="button" @click="copyOutput">コピー</button>
      </div>
      <pre aria-label="変換結果">{{ result.output }}</pre>
    </div>
  </div>
</template>

<style scoped>
.csv-json {
  display: flex;
  flex-direction: column;
  gap: 12px;
  font-size: 14px;
}
textarea {
  width: 100%;
  box-sizing: border-box;
  padding: 8px 12px;
  border: 1px solid #bbb;
  border-radius: 4px;
  font: inherit;
}
.controls {
  display: flex;
  align-items: center;
  gap: 16px;
}
.controls label {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}
button.convert {
  padding: 6px 16px;
  border: none;
  border-radius: 4px;
  background: #1976d2;
  color: #fff;
  font: inherit;
  cursor: pointer;
}
.errors {
  padding: 12px;
  border-radius: 4px;
  background: #fdeded;
  color: #5f2120;
}
.errors ul {
  margin: 4px 0 0;
  padding-left: 20px;
  max-height: 240px;
  overflow: auto;
}
.result-head {
  display: flex;
  align-items: center;
  gap: 16px;
}
pre {
  margin: 8px 0 0;
  padding: 12px;
  background: #f5f5f5;
  border-radius: 4px;
  font-size: 13px;
  max-height: 320px;
  overflow: auto;
}
</style>
