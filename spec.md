# GitHub Native 專案管理工具規格書

## 1. 架構與選型

- 前端：`Vite + TypeScript + 原生 CSS`
- 靜態儀表板部署：`GitHub Pages`
- 可寫入 API：`Vercel Functions`
- 任務主體：`GitHub Issues`
- 排程真相來源：`GitHub Projects v2`
- 自動化：`GitHub Actions`
- GitHub 整合：`GitHub GraphQL API + REST API`
- 測試：`Vitest`
- 時區：`Asia/Taipei`

選型理由：
- 儀表板以靜態站提供低成本讀取能力，適合管理層與成員查看。
- 甘特圖需要回寫 GitHub Projects 欄位，因此額外提供極薄 API 處理安全寫入。
- Issue 負責任務內容，Project v2 自訂欄位負責排程與狀態，責任清楚。
- GitHub Actions 用於資料彙整與 Pages 部署，維持 GitHub-native 工作流。
- Project 欄位同步採 GitHub GraphQL，Issue labels / assignees 採 GitHub REST，同步責任分離。
- GitHub Pages 採官方 `configure-pages`、`upload-pages-artifact`、`deploy-pages` workflow。

## 2. 資料模型

### 2.1 WorkItem

| 欄位 | 型別 | 必填 | 說明 |
| --- | --- | --- | --- |
| id | string | 是 | 儀表板內部唯一識別碼 |
| issueNumber | number | 是 | GitHub Issue 編號 |
| issueUrl | string | 是 | GitHub Issue 網址 |
| title | string | 是 | 任務標題 |
| status | string | 是 | 例如 `todo`、`in-progress`、`in-review`、`done` |
| priority | string | 否 | 優先級 |
| milestone | string \| null | 是 | 所屬 Milestone 名稱 |
| assignees | Assignee[] | 是 | 負責人清單 |
| projectItemId | string | 是 | Project v2 item id |
| projectId | string | 是 | Project v2 id |
| startDate | string \| null | 是 | `YYYY-MM-DD` |
| targetDate | string \| null | 是 | `YYYY-MM-DD` |
| durationDays | number | 是 | 由 start/target 衍生 |
| progressState | string | 是 | `on-track`、`at-risk`、`blocked`、`done` |
| blockedReason | string | 否 | 阻塞原因 |
| linkedPrs | PullRequestLink[] | 是 | 關聯 PR |
| labels | string[] | 是 | Issue labels |
| updatedAt | string | 是 | 最後更新時間 |

### 2.2 Assignee

| 欄位 | 型別 | 必填 | 說明 |
| --- | --- | --- | --- |
| login | string | 是 | GitHub 帳號 |
| name | string | 否 | 顯示名稱 |
| avatarUrl | string | 否 | 頭像網址 |

### 2.3 PullRequestLink

| 欄位 | 型別 | 必填 | 說明 |
| --- | --- | --- | --- |
| number | number | 是 | PR 編號 |
| title | string | 是 | PR 標題 |
| url | string | 是 | PR 網址 |
| state | string | 是 | `open`、`closed`、`merged` |

### 2.4 ProjectSummary

| 欄位 | 型別 | 必填 | 說明 |
| --- | --- | --- | --- |
| totalItems | number | 是 | 任務總數 |
| doneItems | number | 是 | 已完成數量 |
| inProgressItems | number | 是 | 進行中數量 |
| blockedItems | number | 是 | 阻塞數量 |
| overdueItems | number | 是 | 已逾期數量 |
| completionRate | number | 是 | 完成率 |

### 2.5 MemberLoad

| 欄位 | 型別 | 必填 | 說明 |
| --- | --- | --- | --- |
| login | string | 是 | GitHub 帳號 |
| name | string | 否 | 顯示名稱 |
| todoCount | number | 是 | 待辦數量 |
| inProgressCount | number | 是 | 進行中數量 |
| inReviewCount | number | 是 | 審查中數量 |
| blockedCount | number | 是 | 阻塞數量 |

### 2.6 ProjectSnapshot

| 欄位 | 型別 | 必填 | 說明 |
| --- | --- | --- | --- |
| generatedAt | string | 是 | 產出時間 |
| repository | string | 是 | `owner/repo` |
| projectId | string | 是 | GitHub Projects v2 id |
| milestones | string[] | 是 | 所有 milestone |
| members | MemberLoad[] | 是 | 成員負載資料 |
| workItems | WorkItem[] | 是 | 任務資料 |
| summary | ProjectSummary | 是 | 儀表板摘要 |

### 2.7 GanttMutationPayload

| 欄位 | 型別 | 必填 | 說明 |
| --- | --- | --- | --- |
| projectItemId | string | 是 | 要修改的 Project item id |
| startDate | string | 否 | 新開始日 |
| targetDate | string | 否 | 新截止日 |
| status | string | 否 | 新狀態 |
| assigneeLogins | string[] | 否 | 新負責人清單 |

## 3. 關鍵流程

### 3.1 Issue 建立與自動加入 Project

```mermaid
flowchart TD
    A[使用者建立 Issue] --> B[Issue Form 產生固定欄位]
    B --> C[GitHub Actions 驗證 Issue]
    C --> D{欄位合法?}
    D -- 否 --> E[加 needs-fix 並留言]
    D -- 是 --> F[加入 GitHub Project]
    F --> G[補預設 Status 與日期欄位]
    G --> H[重建 project-data.json]
    H --> I[部署 Dashboard]
```

### 3.2 甘特圖拖拉更新時程

```mermaid
flowchart TD
    A[使用者拖拉甘特圖 bar] --> B[前端 optimistic update]
    B --> C[呼叫 PATCH schedule API]
    C --> D[API 驗證使用者與權限]
    D --> E[更新 Project Start date / Target date]
    E --> F{GitHub 更新成功?}
    F -- 是 --> G[回傳最新 item]
    F -- 否 --> H[前端回滾並顯示錯誤]
    G --> I[下一輪 JSON 重建同步畫面]
```

### 3.3 甘特圖更新狀態與負責人

```mermaid
flowchart TD
    A[使用者修改 status 或 assignee] --> B[呼叫 PATCH API]
    B --> C[API 更新 Project 欄位]
    C --> D[同步更新 Issue label / assignees]
    D --> E[回傳最新資料]
    E --> F[Dashboard 同步顯示]
```

### 3.4 PR 驗收與完成

```mermaid
flowchart TD
    A[開發者建立 PR 並關聯 Issue] --> B[Workflow 解析 linked issue]
    B --> C[將對應 WorkItem 標記 in-review]
    C --> D{PR merged?}
    D -- 否 --> E[保留原狀或回退 in-progress]
    D -- 是 --> F[將 WorkItem 標記 done]
    F --> G[重建 project-data.json]
```

## 4. 虛擬碼

```text
function buildSnapshot(projectItems, issues, pullRequests):
  workItems = []

  for each projectItem in projectItems:
    issue = findLinkedIssue(projectItem, issues)
    prs = findLinkedPullRequests(issue, pullRequests)
    workItem = normalizeWorkItem(projectItem, issue, prs)
    workItems.append(workItem)

  return {
    generatedAt,
    repository,
    projectId,
    milestones: collectMilestones(workItems),
    members: buildMemberLoads(workItems),
    workItems,
    summary: buildSummary(workItems)
  }

function patchSchedule(projectItemId, startDate, targetDate):
  validateDateRange(startDate, targetDate)
  updateProjectField(projectItemId, "Start date", startDate)
  updateProjectField(projectItemId, "Target date", targetDate)
  return fetchProjectItem(projectItemId)

function patchStatus(projectItemId, status):
  updateProjectField(projectItemId, "Status", status)
  syncIssueLabel(projectItemId, status)
  return fetchProjectItem(projectItemId)

function patchAssignees(projectItemId, assigneeLogins):
  updateProjectAssignees(projectItemId, assigneeLogins)
  syncIssueAssignees(projectItemId, assigneeLogins)
  return fetchProjectItem(projectItemId)

function handleIssueOpened(issueNodeId):
  item = addIssueToProject(projectId, issueNodeId)
  startDate = parseIssueSection(issue.body, "預計開始日")
  targetDate = parseIssueSection(issue.body, "預計截止日")
  setDefaultStatus(item.id, "todo")
  if startDate exists:
    updateProjectField(item.id, "Start date", startDate)
  if targetDate exists:
    updateProjectField(item.id, "Target date", targetDate)

function deployPages():
  snapshot = buildSnapshot(projectItems, issues, pullRequests)
  write public/project-data.json
  build vite
  upload pages artifact
  deploy to github pages
```

## 5. 系統脈絡圖

```mermaid
flowchart LR
    U[團隊成員] --> GI[GitHub Issues / PRs]
    GI --> GP[GitHub Projects v2]
    GI --> GA[GitHub Actions]
    GP --> GA
    GA --> JSON[project-data.json]
    JSON --> FE[GitHub Pages Dashboard]
    U --> FE
    FE --> API[Vercel Functions API]
    API --> GHAPI[GitHub GraphQL / REST API]
    GHAPI --> GP
    GHAPI --> GI
```

## 6. 容器/部署概觀

```mermaid
flowchart TD
    A[GitHub Repository] --> B[GitHub Actions Runner]
    B --> C[Build Dashboard]
    C --> D[GitHub Pages]
    E[Vercel Functions] --> F[GitHub API]
    D --> G[Browser]
    G --> E
```

## 7. 模組關係圖

### Frontend

```mermaid
flowchart LR
    A[main.ts] --> B[api.ts]
    A --> C[dashboard.ts]
    A --> D[gantt.ts]
    A --> E[board.ts]
    A --> F[member-load.ts]
    B --> G[project-data.json]
```

### Automation / API

```mermaid
flowchart LR
    A[generate-project-data.mjs] --> B[github-project-client.mjs]
    A --> C[project-normalizer.mjs]
    D[gantt mutation api] --> B
    D --> E[issue-sync.mjs]
    F[project-workflow] --> A
    F --> D
```

## 8. 序列圖

```mermaid
sequenceDiagram
    participant User as 團隊成員
    participant Dashboard as Dashboard
    participant API as Mutation API
    participant GH as GitHub API
    participant Action as GitHub Actions
    participant Pages as GitHub Pages

    User->>Dashboard: 拖拉甘特圖 bar
    Dashboard->>API: PATCH /api/gantt/items/{id}/schedule
    API->>GH: 更新 Project date fields
    GH-->>API: 回傳最新 item
    API-->>Dashboard: 回傳最新資料
    Action->>GH: 定時讀取 Project / Issue / PR
    Action->>Action: 產生 project-data.json
    Action->>Pages: 部署最新 Dashboard
```

## 9. ER 圖

```mermaid
erDiagram
    ISSUE ||--|| PROJECT_ITEM : "對應"
    ISSUE ||--o{ PULL_REQUEST : "linked"
    PROJECT_ITEM {
      string id
      string status
      string startDate
      string targetDate
      string priority
    }
    ISSUE {
      int number
      string title
      string state
      string milestone
    }
    PULL_REQUEST {
      int number
      string title
      string state
    }
```

## 10. 類別圖（後端關鍵類別）

```mermaid
classDiagram
    class ProjectSnapshotBuilder {
      +buildSnapshot(projectItems, issues, pullRequests)
      +buildSummary(workItems)
      +buildMemberLoads(workItems)
    }
    class GitHubProjectClient {
      +fetchProjectItems()
      +updateDateField(itemId, fieldName, value)
      +updateSingleSelectField(itemId, fieldName, optionId)
      +updateAssignees(itemId, assignees)
    }
    class IssueSyncService {
      +syncStatusLabel(issueNumber, status)
      +syncAssignees(issueNumber, assigneeLogins)
    }
    class GanttMutationController {
      +patchSchedule(request)
      +patchStatus(request)
      +patchAssignees(request)
    }

    ProjectSnapshotBuilder --> GitHubProjectClient
    GanttMutationController --> GitHubProjectClient
    GanttMutationController --> IssueSyncService
```

## 11. 流程圖

```mermaid
flowchart TD
    A[載入 project-data.json] --> B[渲染摘要卡]
    B --> C[渲染任務看板]
    C --> D[渲染成員負載]
    D --> E[渲染甘特圖]
    E --> F{使用者是否進行編輯}
    F -- 否 --> G[保持只讀顯示]
    F -- 是 --> H[呼叫 mutation API]
    H --> I[成功則保留 optimistic state]
    H --> J[失敗則回滾並提示]
```

## 12. 狀態圖

```mermaid
stateDiagram-v2
    [*] --> Todo
    Todo --> Ready
    Ready --> InProgress
    InProgress --> InReview
    InProgress --> Blocked
    Blocked --> InProgress
    InReview --> InProgress
    InReview --> Done
    Todo --> Canceled
    Ready --> Canceled
    InProgress --> Canceled
    Blocked --> Canceled
```

## 驗收標準

- 使用者可透過 Issue Form 建立任務並自動進入 GitHub Project。
- Issue 建立後，workflow 需自動加入指定 GitHub Project 並同步預設欄位。
- Dashboard 需顯示摘要、看板、成員負載與甘特圖。
- 甘特圖需支援拖拉調整開始/截止日。
- 甘特圖需支援更新 `status` 與 `assignees`。
- API 更新失敗時，前端需回滾 optimistic state。
- `project-data.json` 必須統一來自 GitHub Issues、PRs、Projects 資料。
- GitHub Pages workflow 必須使用官方 Pages actions 完成部署。
- PR merge 後，關聯任務需同步轉為 `done`。
- 手機版至少可讀取甘特圖與摘要；桌機版需可完整編輯。
