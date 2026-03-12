import type { MemberLoad } from "./types";

/**
 * 顯示成員工作負載摘要。
 */
export function renderMemberLoad(members: MemberLoad[]): string {
  return `
    <section class="panel">
      <div class="panel-header">
        <h2>成員負載</h2>
        <p>快速辨識誰手上有阻塞或審查中的任務。</p>
      </div>
      <div class="member-table">
        <div class="member-row member-head">
          <span>成員</span>
          <span>Todo</span>
          <span>In Progress</span>
          <span>Review</span>
          <span>Blocked</span>
        </div>
        ${members
          .map(
            (member) => `
              <div class="member-row">
                <span>${member.name ?? member.login}</span>
                <span>${member.todoCount}</span>
                <span>${member.inProgressCount}</span>
                <span>${member.inReviewCount}</span>
                <span>${member.blockedCount}</span>
              </div>
            `
          )
          .join("")}
      </div>
    </section>
  `;
}
