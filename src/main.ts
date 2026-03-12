import { patchAssignees, patchSchedule, patchStatus, fetchProjectSnapshot, isMutationApiConfigured } from "./api";
import { renderBoard } from "./board";
import { renderSummary } from "./dashboard";
import { renderGantt } from "./gantt";
import { renderMemberLoad } from "./member-load";
import { DashboardStore } from "./state";
import type { WorkItem } from "./types";
import { addDays, parseDate } from "./utils";
import "./style.css";

const app = document.querySelector<HTMLDivElement>("#app");
const store = new DashboardStore();
const mutationEnabled = isMutationApiConfigured();

if (!app) {
  throw new Error("找不到 app root");
}

/**
 * 將目前快照渲染到畫面。
 */
function paint(): void {
  const snapshot = store.getSnapshot();
  app.innerHTML = `
    <main class="page-shell">
      <header class="hero">
        <div>
          <p class="eyebrow">GitHub Native Dashboard</p>
          <h1>專案進度與甘特圖控制台</h1>
          <p class="hero-copy">
            以 Issues 當任務主體、Projects 日期欄位當排程真相，提供可編輯甘特圖與管理總覽。
          </p>
        </div>
        <aside class="hero-side">
          <span>Repo</span>
          <strong>${snapshot.repository}</strong>
          <span>Project</span>
          <strong>${snapshot.projectId}</strong>
          <span>Last Generated</span>
          <strong>${new Date(snapshot.generatedAt).toLocaleString("zh-TW")}</strong>
        </aside>
      </header>
      ${mutationEnabled ? "" : '<section class="mode-banner">目前使用 GitHub Pages 展示模式，尚未設定可寫入 API，因此甘特圖調整功能已停用。</section>'}
      ${renderSummary(snapshot)}
      <section class="panel-stack">
        ${renderBoard(snapshot.workItems)}
        ${renderMemberLoad(snapshot.members)}
      </section>
    </main>
  `;

  const main = app.querySelector(".page-shell");
  if (!main) {
    return;
  }

  main.appendChild(
    renderGantt(snapshot.workItems, {
      onShift: async (projectItemId, offsetDays) => handleShift(projectItemId, offsetDays),
      onResize: async (projectItemId, edge, offsetDays) => handleResize(projectItemId, edge, offsetDays),
      onStatusChange: async (projectItemId, status) => handleStatus(projectItemId, status),
      onAssigneePrompt: async (projectItemId) => handleAssignees(projectItemId)
    }, {
      editable: mutationEnabled
    })
  );
}

/**
 * 包裝 optimistic update，失敗時回滾。
 */
async function withOptimisticUpdate(
  projectItemId: string,
  optimisticPatch: Partial<WorkItem>,
  task: () => Promise<Partial<WorkItem>>
): Promise<void> {
  const snapshot = store.getSnapshot();
  const currentItem = snapshot.workItems.find((item) => item.projectItemId === projectItemId);

  if (!currentItem) {
    return;
  }

  store.updateWorkItem(projectItemId, optimisticPatch);
  paint();

  try {
    const serverPatch = await task();
    store.updateWorkItem(projectItemId, serverPatch);
    paint();
  } catch (error) {
    store.updateWorkItem(projectItemId, currentItem);
    paint();
    window.alert(error instanceof Error ? error.message : "更新失敗");
  }
}

/**
 * 平移整段時程。
 */
async function handleShift(projectItemId: string, offsetDays: number): Promise<void> {
  const item = store.getSnapshot().workItems.find((entry) => entry.projectItemId === projectItemId);

  if (!item) {
    return;
  }

  const nextStart = item.startDate ? addDays(parseDate(item.startDate) ?? new Date(), offsetDays) : item.startDate;
  const nextTarget = item.targetDate ? addDays(parseDate(item.targetDate) ?? new Date(), offsetDays) : item.targetDate;

  await withOptimisticUpdate(projectItemId, { startDate: nextStart, targetDate: nextTarget }, () =>
    patchSchedule(projectItemId, {
      startDate: nextStart,
      targetDate: nextTarget
    })
  );
}

/**
 * 調整 bar 左右端。
 */
async function handleResize(projectItemId: string, edge: "start" | "end", offsetDays: number): Promise<void> {
  const item = store.getSnapshot().workItems.find((entry) => entry.projectItemId === projectItemId);

  if (!item) {
    return;
  }

  const nextStart = edge === "start" && item.startDate ? addDays(parseDate(item.startDate) ?? new Date(), offsetDays) : item.startDate;
  const nextTarget = edge === "end" && item.targetDate ? addDays(parseDate(item.targetDate) ?? new Date(), offsetDays) : item.targetDate;

  await withOptimisticUpdate(projectItemId, { startDate: nextStart, targetDate: nextTarget }, () =>
    patchSchedule(projectItemId, {
      startDate: nextStart,
      targetDate: nextTarget
    })
  );
}

/**
 * 更新工作狀態。
 */
async function handleStatus(projectItemId: string, status: string): Promise<void> {
  await withOptimisticUpdate(projectItemId, { status }, () => patchStatus(projectItemId, { status }));
}

/**
 * 使用 prompt 快速編輯 assignee，維持第一版實作輕量。
 */
async function handleAssignees(projectItemId: string): Promise<void> {
  const item = store.getSnapshot().workItems.find((entry) => entry.projectItemId === projectItemId);

  if (!item) {
    return;
  }

  const current = item.assignees.map((assignee) => assignee.login).join(", ");
  const input = window.prompt("請輸入 assignee login，多位以逗號分隔", current);

  if (input === null) {
    return;
  }

  const assigneeLogins = input
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);

  await withOptimisticUpdate(
    projectItemId,
    {
      assignees: assigneeLogins.map((login) => ({ login }))
    },
    () => patchAssignees(projectItemId, { assigneeLogins })
  );
}

/**
 * 啟動應用程式。
 */
async function bootstrap(): Promise<void> {
  const snapshot = await fetchProjectSnapshot();
  store.setSnapshot(snapshot);
  paint();
}

bootstrap().catch((error) => {
  app.innerHTML = `<main class="page-shell"><section class="panel"><h1>載入失敗</h1><p>${error instanceof Error ? error.message : "未知錯誤"}</p></section></main>`;
});
