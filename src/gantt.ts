import type { WorkItem } from "./types";
import { addDays, daysFrom, getDateRange, statusToken, truncate } from "./utils";

export interface GanttHandlers {
  onShift: (projectItemId: string, offsetDays: number) => Promise<void>;
  onResize: (projectItemId: string, edge: "start" | "end", offsetDays: number) => Promise<void>;
  onStatusChange: (projectItemId: string, status: string) => Promise<void>;
  onAssigneePrompt: (projectItemId: string) => Promise<void>;
}

export interface GanttRenderOptions {
  editable: boolean;
}

const STATUS_OPTIONS = ["todo", "in-progress", "in-review", "blocked", "done"];

/**
 * 產生桌機優先的甘特圖結構與互動控制。
 */
export function renderGantt(items: WorkItem[], handlers: GanttHandlers, options: GanttRenderOptions): HTMLElement {
  const range = getDateRange(items);
  const days = Math.max(10, daysFrom(range.start, addDays(range.end, 1)));
  const root = document.createElement("section");

  root.className = "panel";
  root.innerHTML = `
    <div class="panel-header">
      <h2>甘特圖</h2>
      <p>${options.editable ? "可拖拉調整時程，也可直接改狀態與負責人。" : "目前為唯讀展示模式，請部署 API 後再啟用調整。"}</p>
    </div>
    <div class="gantt-shell">
      <div class="gantt-head"></div>
      <div class="gantt-body"></div>
    </div>
  `;

  const head = root.querySelector(".gantt-head");
  const body = root.querySelector(".gantt-body");

  if (!head || !body) {
    return root;
  }

  head.innerHTML = `
    <div class="gantt-meta-head">工作項目</div>
    <div class="gantt-scale" style="grid-template-columns: repeat(${days}, minmax(44px, 1fr));">
      ${Array.from({ length: days }, (_, index) => {
        const current = addDays(range.start, index);
        return `<span>${current.slice(5)}</span>`;
      }).join("")}
    </div>
  `;

  items.forEach((item) => {
    const row = document.createElement("div");
    row.className = "gantt-row";
    const startOffset = daysFrom(range.start, item.startDate);
    const duration = Math.max(1, item.durationDays);

    row.innerHTML = `
      <div class="gantt-meta">
        <a href="${item.issueUrl}" target="_blank" rel="noreferrer">#${item.issueNumber}</a>
        <strong>${truncate(item.title, 42)}</strong>
        <span>${item.milestone ?? "未排里程碑"}</span>
        <button class="assignee-button" data-assignee-id="${item.projectItemId}" ${options.editable ? "" : "disabled"}>
          ${item.assignees.map((assignee) => assignee.login).join(", ") || "指派"}
        </button>
        <select class="status-select" data-status-id="${item.projectItemId}" ${options.editable ? "" : "disabled"}>
          ${STATUS_OPTIONS.map(
            (status) => `<option value="${status}" ${item.status === status ? "selected" : ""}>${status}</option>`
          ).join("")}
        </select>
      </div>
      <div class="gantt-track" style="grid-template-columns: repeat(${days}, minmax(44px, 1fr));">
        <div class="gantt-bar ${statusToken(item.status)}"
          style="grid-column: ${startOffset + 1} / span ${duration};"
          data-item-id="${item.projectItemId}">
          <button class="drag-handle left" data-resize-start="${item.projectItemId}" aria-label="調整開始日" ${options.editable ? "" : "disabled"}></button>
          <span>${item.startDate ?? "?"} → ${item.targetDate ?? "?"}</span>
          <div class="drag-controls">
            <button data-shift-left="${item.projectItemId}" aria-label="向左平移" ${options.editable ? "" : "disabled"}>-1d</button>
            <button data-shift-right="${item.projectItemId}" aria-label="向右平移" ${options.editable ? "" : "disabled"}>+1d</button>
          </div>
          <button class="drag-handle right" data-resize-end="${item.projectItemId}" aria-label="調整截止日" ${options.editable ? "" : "disabled"}></button>
        </div>
      </div>
    `;

    body.appendChild(row);
  });

  root.querySelectorAll<HTMLButtonElement>("[data-shift-left]").forEach((button) => {
    button.addEventListener("click", () => handlers.onShift(button.dataset.shiftLeft ?? "", -1));
  });

  root.querySelectorAll<HTMLButtonElement>("[data-shift-right]").forEach((button) => {
    button.addEventListener("click", () => handlers.onShift(button.dataset.shiftRight ?? "", 1));
  });

  root.querySelectorAll<HTMLButtonElement>("[data-resize-start]").forEach((button) => {
    button.addEventListener("click", () => handlers.onResize(button.dataset.resizeStart ?? "", "start", -1));
  });

  root.querySelectorAll<HTMLButtonElement>("[data-resize-end]").forEach((button) => {
    button.addEventListener("click", () => handlers.onResize(button.dataset.resizeEnd ?? "", "end", 1));
  });

  root.querySelectorAll<HTMLSelectElement>(".status-select").forEach((select) => {
    select.addEventListener("change", () => handlers.onStatusChange(select.dataset.statusId ?? "", select.value));
  });

  root.querySelectorAll<HTMLButtonElement>(".assignee-button").forEach((button) => {
    button.addEventListener("click", () => handlers.onAssigneePrompt(button.dataset.assigneeId ?? ""));
  });

  return root;
}
