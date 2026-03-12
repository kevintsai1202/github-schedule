import type { WorkItem } from "./types";
import { statusToken, truncate } from "./utils";

const BOARD_COLUMNS = ["todo", "in-progress", "in-review", "blocked", "done"];

/**
 * 將工作項目按狀態分欄渲染。
 */
export function renderBoard(items: WorkItem[]): string {
  const columns = BOARD_COLUMNS.map((status) => {
    const filtered = items.filter((item) => item.status === status);

    return `
      <section class="board-column">
        <header>
          <h3>${status}</h3>
          <span>${filtered.length}</span>
        </header>
        <div class="board-list">
          ${filtered
            .map(
              (item) => `
                <article class="board-card ${statusToken(item.status)}">
                  <a href="${item.issueUrl}" target="_blank" rel="noreferrer">#${item.issueNumber}</a>
                  <strong>${truncate(item.title, 48)}</strong>
                  <span>${item.assignees.map((assignee) => assignee.login).join(", ") || "未指派"}</span>
                </article>
              `
            )
            .join("")}
        </div>
      </section>
    `;
  });

  return `
    <section class="panel">
      <div class="panel-header">
        <h2>任務看板</h2>
        <p>以 Issue 為主體，PR 只作為交付與審查關聯。</p>
      </div>
      <div class="board-grid">
        ${columns.join("")}
      </div>
    </section>
  `;
}
