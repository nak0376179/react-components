// *.vue は vue-tsc を入れていないため tsc では中身を型チェックせず、コンポーネントとしてだけ扱う。
declare module "*.vue" {
  import type { DefineComponent } from "vue"
  const component: DefineComponent<Record<string, unknown>, Record<string, unknown>, unknown>
  export default component
}

// vite の ?raw インポート（ソースコード表示用）。
declare module "*?raw" {
  const src: string
  export default src
}
