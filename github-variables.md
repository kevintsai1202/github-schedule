# GitHub Variables Checklist

此文件整理 GitHub Project v2 與部署所需的 Repository Variables。

## 1. 自動抓取欄位 ID

先補 `gh` 權限：

```powershell
gh auth refresh -s read:project
```

```powershell
npm run project:fields -- --project-id <PROJECT_ID> --repo kevintsai1202/github-schedule
```

若只要 JSON：

```powershell
node scripts/print-project-field-ids.mjs --project-id <PROJECT_ID> --repo kevintsai1202/github-schedule --json
```

## 2. 直接寫入 Variables

```powershell
pwsh ./scripts/set-github-project-vars.ps1 -ProjectId <PROJECT_ID> -Repository kevintsai1202/github-schedule
```

## 3. 必要 Variables

以下鍵值需存在於 `Settings > Secrets and variables > Actions > Variables`：

```text
GITHUB_REPOSITORY_NAME=kevintsai1202/github-schedule
GITHUB_PROJECT_ID=
GITHUB_PROJECT_STATUS_FIELD_ID=
GITHUB_PROJECT_START_DATE_FIELD_ID=
GITHUB_PROJECT_TARGET_DATE_FIELD_ID=
GITHUB_PROJECT_STATUS_TODO_OPTION_ID=
GITHUB_PROJECT_STATUS_IN_PROGRESS_OPTION_ID=
GITHUB_PROJECT_STATUS_IN_REVIEW_OPTION_ID=
GITHUB_PROJECT_STATUS_DONE_OPTION_ID=
GITHUB_PROJECT_STATUS_BLOCKED_OPTION_ID=
```

## 4. Pages 設定

- `Settings > Pages`
- `Build and deployment`
- `Source = GitHub Actions`

## 5. Vercel 建議設定

此專案採雙部署：
- GitHub Pages：靜態前端 `dist/`
- Vercel：`api/` Functions

Vercel Project 建議：
- Framework Preset：`Other`
- Install Command：`npm install`
- Build Command：`npm run build`
- Output Directory：`dist`
- Root Directory：repo root
- Node.js Version：`22.x`

若只部署 API，可在 Vercel Dashboard 關閉 Production Deployment 的前端使用需求，保留 Functions 與環境變數即可。
