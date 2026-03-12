# GitHub Native 專案管理工具 API 文件

## 概述

本專案對外介面分為三類：
- GitHub Issue Forms 輸入契約
- GitHub Pages 靜態資料介面
- Vercel Functions 變更寫入 API
- `gh` CLI 專案初始化輔助腳本

## 1. Issue Form 契約

### 1.1 任務 Issue 標題

- 用途：任務標題
- 規則：不得為空，建議格式 `[Task] 任務名稱`

### 1.2 任務 Issue Body 區段

```md
### 類型
Feature

### 說明
建立專案首頁的甘特圖檢視

### 驗收條件
- 可以拖拉日期
- 可以更新狀態

### 預計開始日
2026-03-16

### 預計截止日
2026-03-21

### 優先級
High

### 阻塞說明
無
```

### 1.3 欄位驗證規則

| 欄位 | 規則 |
| --- | --- |
| 類型 | 必填，允許 `Feature` `Bug` `Task` |
| 說明 | 必填 |
| 驗收條件 | 必填 |
| 預計開始日 | 選填，格式 `YYYY-MM-DD` |
| 預計截止日 | 選填，格式 `YYYY-MM-DD` |
| 優先級 | 必填，允許 `Low` `Medium` `High` `Critical` |
| 阻塞說明 | 可空 |

## 2. 靜態資料 API

### 2.1 取得 Dashboard 資料

- Method：`GET`
- Path：`/project-data.json`
- 說明：提供摘要、看板、成員負載與甘特圖資料

#### Response 200

```json
{
  "generatedAt": "2026-03-12T23:00:00+08:00",
  "repository": "kevintsai1202/github-schedule",
  "projectId": "PVT_kwDOB-example",
  "milestones": ["Sprint 1", "Sprint 2"],
  "members": [
    {
      "login": "alice",
      "name": "Alice",
      "todoCount": 1,
      "inProgressCount": 2,
      "inReviewCount": 1,
      "blockedCount": 0
    }
  ],
  "summary": {
    "totalItems": 12,
    "doneItems": 4,
    "inProgressItems": 5,
    "blockedItems": 1,
    "overdueItems": 2,
    "completionRate": 33.3
  },
  "workItems": [
    {
      "id": "issue-23",
      "issueNumber": 23,
      "issueUrl": "https://github.com/owner/repo/issues/23",
      "title": "建立甘特圖檢視",
      "status": "in-progress",
      "priority": "High",
      "milestone": "Sprint 1",
      "assignees": [
        {
          "login": "alice",
          "name": "Alice",
          "avatarUrl": "https://avatars.githubusercontent.com/u/1?v=4"
        }
      ],
      "projectItemId": "PVTI_example",
      "projectId": "PVT_example",
      "startDate": "2026-03-16",
      "targetDate": "2026-03-21",
      "durationDays": 6,
      "progressState": "on-track",
      "blockedReason": "",
      "linkedPrs": [
        {
          "number": 56,
          "title": "feat: add gantt timeline",
          "url": "https://github.com/owner/repo/pull/56",
          "state": "open"
        }
      ],
      "labels": ["status:in-progress", "type:feature"],
      "updatedAt": "2026-03-12T23:00:00Z"
    }
  ]
}
```

#### Response 規則

- 僅包含已加入指定 GitHub Project 的 Issue
- 依 `startDate`、`targetDate` 與 `status` 產生甘特圖資料
- 前端讀取時需加上 cache-busting 並使用 `no-store`
- 前端讀取路徑需以 Vite `BASE_URL` 組合，不得寫死為 `/project-data.json`
- GitHub Pages build 時需注入 `VITE_BASE_URL=/github-schedule/`，其他環境預設 `/`

## 3. Gantt Mutation API

### 3.1 更新時程

- Method：`PATCH`
- Path：`/api/gantt/items/{projectItemId}/schedule`
- 說明：更新 `Start date` 與 `Target date`

#### Request Body

```json
{
  "startDate": "2026-03-16",
  "targetDate": "2026-03-21"
}
```

#### Response 200

```json
{
  "ok": true,
  "item": {
    "projectItemId": "PVTI_example",
    "startDate": "2026-03-16",
    "targetDate": "2026-03-21"
  }
}
```

#### 規則

- `targetDate` 不可早於 `startDate`
- 至少要提供一個欄位
- 只更新 Project date fields，不回寫 Issue body

### 3.2 更新狀態

- Method：`PATCH`
- Path：`/api/gantt/items/{projectItemId}/status`
- 說明：更新 Project status 並同步 Issue label

#### Request Body

```json
{
  "status": "in-review"
}
```

#### Response 200

```json
{
  "ok": true,
  "item": {
    "projectItemId": "PVTI_example",
    "status": "in-review",
    "labels": ["status:in-review", "type:feature"]
  }
}
```

### 3.3 更新負責人

- Method：`PATCH`
- Path：`/api/gantt/items/{projectItemId}/assignees`
- 說明：更新 Project assignees 並同步 Issue assignees

#### Request Body

```json
{
  "assigneeLogins": ["alice", "bob"]
}
```

#### Response 200

```json
{
  "ok": true,
  "item": {
    "projectItemId": "PVTI_example",
    "assignees": [
      {
        "login": "alice",
        "name": "Alice"
      },
      {
        "login": "bob",
        "name": "Bob"
      }
    ]
  }
}
```

## 4. 錯誤回應策略

### 4.1 驗證錯誤

```json
{
  "ok": false,
  "error": "targetDate 不可早於 startDate"
}
```

### 4.2 權限錯誤

```json
{
  "ok": false,
  "error": "目前使用者沒有更新此 Project item 的權限"
}
```

## 5. GitHub Actions 事件契約

| Event | 說明 |
| --- | --- |
| `issues.opened` | 驗證新 Issue，加入 Project，補預設欄位 |
| `issues.edited` | 重新驗證 Issue |
| `pull_request.opened` | 同步關聯 Issue 到 `in-review` 或保留原狀 |
| `pull_request.closed` | merged 時將關聯 Issue 標記 `done` |
| `schedule` | 定時重建 `project-data.json` |
| `push` | 前端或腳本變更後重新建置並部署 Pages |

## 6. 環境變數

| 名稱 | 必填 | 說明 |
| --- | --- | --- |
| `GITHUB_TOKEN` | 是 | Actions 內建 Token |
| `GITHUB_APP_TOKEN` | 否 | API 層更新 GitHub 用 |
| `VITE_API_BASE_URL` | 否 | 前端寫入 API 基底網址，未設定時前端進入唯讀模式 |
| `PROJECT_REPOSITORY_NAME` | 是 | 目標倉庫 |
| `PROJECT_ID` | 是 | Project v2 id |
| `PROJECT_STATUS_FIELD_ID` | 是 | Status 欄位 id |
| `PROJECT_START_DATE_FIELD_ID` | 是 | Start date 欄位 id |
| `PROJECT_TARGET_DATE_FIELD_ID` | 是 | Target date 欄位 id |
| `PROJECT_STATUS_TODO_OPTION_ID` | 是 | `todo` 對應的 option id |
| `PROJECT_STATUS_IN_PROGRESS_OPTION_ID` | 否 | `in-progress` option id |
| `PROJECT_STATUS_IN_REVIEW_OPTION_ID` | 否 | `in-review` option id |
| `PROJECT_STATUS_DONE_OPTION_ID` | 否 | `done` option id |
| `PROJECT_STATUS_BLOCKED_OPTION_ID` | 否 | `blocked` option id |
| `PROJECT_ALLOWED_USERS` | 否 | 可更新排程的人員白名單 |

## 7. 相容性說明

- 儀表板對讀取端採純靜態輸出。
- 甘特圖編輯需依賴 serverless API，不能只靠 GitHub Pages。
- GitHub Pages 若未設定 `VITE_API_BASE_URL`，前端僅提供展示，不發送任何 `/api/*` 寫入請求。
- Status 與 Assignees 需同時維護 Project 欄位與 Issue 對應欄位。
- 第一版只支援單一 repo、單一 GitHub Project。
- Pages 發布需在 Repository Settings 的 `Pages > Build and deployment` 選擇 `GitHub Actions`。
- 若 Actions 內建 Token 對 Project v2 權限不足，`generate-project-data` 需保留現有 `public/project-data.json` 作為 fallback，避免 Pages 發布失敗。

## 8. gh 輔助腳本

### 8.1 列出 Project 欄位與 option id

- Command：`node scripts/print-project-field-ids.mjs --project-id <project-id>`
- 說明：列出 Project 欄位 id、`Status` option id，並輸出推薦的 GitHub Variables 內容
- 前置：`gh auth refresh -s read:project`
- 實作上需使用可正確傳遞多行 GraphQL query 的 `gh api graphql` 參數形式，避免 Windows shell 將 query 截斷

### 8.2 輸出 Variables 樣板

- Command：`node scripts/print-project-field-ids.mjs --project-id <project-id> --repo <owner/repo>`
- 說明：補上 repo 名稱後，輸出可直接複製到 GitHub Repository Variables 的鍵值清單
