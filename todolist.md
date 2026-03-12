# Todo List

## 任務狀態

| ID | 任務 | 狀態 | 備註 |
| --- | --- | --- | --- |
| T1 | 建立與完成 `spec.md`、`api.md`、`todolist.md` | Completed | 文件已建立完成 |
| T2 | 初始化前端專案骨架與 TypeScript 設定 | Completed | Vite 設定與基礎目錄已建立 |
| T3 | 建立 Dashboard 版型、摘要卡、任務看板、成員負載頁 | Completed | 已完成 UI 骨架與範例資料 |
| T4 | 實作甘特圖顯示與拖拉互動 | Completed | 已支援平移、伸縮與 optimistic update |
| T5 | 實作資料模型、靜態資料載入與 normalization | Completed | 已建立 `project-data.json` 與前端模型 |
| T6 | 實作 Vercel Functions API 骨架與 GitHub 更新服務 | Completed | 已完成 schedule/status/assignees endpoint 骨架 |
| T7 | 建立 GitHub Issue Forms、PR Template 與 workflow 骨架 | Completed | 已補 issue template、PR template 與 workflows |
| T8 | 補齊測試與範例資料 | Completed | 已補工具函式與 schedule API handler 測試 |
| T9 | 執行 build/test 驗證並更新文件 | Completed | `npm test` 與 `npm run build` 通過 |
| T10 | 實作真實 GitHub Project v2 欄位同步 | Completed | 已接 GraphQL 欄位更新與 Issue label/assignee 同步 |
| T11 | 補齊 GitHub Pages 正式部署設定 | Completed | 已改為官方 Pages actions 部署流程 |
| T12 | 使用 gh 建立遠端 repo 並發佈 | Completed | 已建立 repo、push、啟用 Pages workflow 並成功部署 |
| T13 | 建立 gh 欄位探索腳本、Vercel 設定與 Variables 文件 | Completed | 已補欄位探索腳本、vercel.json 與 Variables 文件 |
| T14 | 修正 GitHub Pages 子路徑白屏並補更多測試資料 | Completed | 已改相對資產路徑並新增 3 筆示例任務 |
| T15 | 修正無尾斜線 Pages URL 造成 JSON 路徑錯誤 | Completed | 已改為依部署環境注入 base path |

## 執行紀錄

- 2026-03-12：建立初版任務拆分，開始進行 T1。
- 2026-03-12：完成 T1，開始初始化前端與專案結構。
- 2026-03-12：完成 T2 至 T7，已建立 Dashboard、甘特圖、API 骨架與 GitHub 模板。
- 2026-03-12：完成 T8、T9，測試與建置通過，專案骨架可進入實際 GitHub 串接階段。
- 2026-03-13：開始進行 T10，補上真實 GitHub Project v2 欄位同步與 Pages 正式部署。
- 2026-03-13：完成 T10、T11，已接上 GitHub GraphQL/REST 同步與官方 Pages 部署 workflow，測試與建置再次通過。
- 2026-03-13：開始進行 T12，準備透過 gh 建立 repo 並直接發佈。
- 2026-03-13：完成 T12，已用 gh 建立 `kevintsai1202/github-schedule`、啟用 Pages workflow，站點回應 200。
- 2026-03-13：開始進行 T13，準備補 gh 欄位探索腳本、Vercel 設定與 Variables 文件。
- 2026-03-13：完成 T13，已補 `print-project-field-ids`、`set-github-project-vars.ps1`、`vercel.json` 與 Variables 文件。
- 2026-03-13：開始進行 T14，準備修正 GitHub Pages 子路徑白屏並補更多測試資料。
- 2026-03-13：完成 T14，已修正 Pages 子路徑資產載入並補上更多測試資料，測試與建置通過。
- 2026-03-13：開始進行 T15，準備修正無尾斜線 Pages URL 導致 `project-data.json` 路徑解析錯誤。
- 2026-03-13：完成 T15，已改成依部署環境注入 base path，避免無尾斜線 URL 抓錯 JSON 路徑。
