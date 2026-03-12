import type { ProjectSnapshot } from "./types";

/**
 * 建立頂部摘要卡區塊。
 */
export function renderSummary(snapshot: ProjectSnapshot): string {
  const { summary } = snapshot;

  return `
    <section class="summary-grid">
      <article class="summary-card">
        <span class="summary-label">任務總數</span>
        <strong>${summary.totalItems}</strong>
      </article>
      <article class="summary-card">
        <span class="summary-label">完成率</span>
        <strong>${summary.completionRate}%</strong>
      </article>
      <article class="summary-card">
        <span class="summary-label">進行中</span>
        <strong>${summary.inProgressItems}</strong>
      </article>
      <article class="summary-card">
        <span class="summary-label">阻塞</span>
        <strong>${summary.blockedItems}</strong>
      </article>
      <article class="summary-card">
        <span class="summary-label">逾期</span>
        <strong>${summary.overdueItems}</strong>
      </article>
    </section>
  `;
}
