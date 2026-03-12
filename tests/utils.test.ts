import { describe, expect, it } from "vitest";
import { diffDays, normalizeWorkItem } from "../src/utils";
import type { WorkItem } from "../src/types";

describe("diffDays", () => {
  it("應計算含起訖日在內的天數", () => {
    expect(diffDays("2026-03-16", "2026-03-21")).toBe(6);
  });

  it("缺少日期時應回傳最小寬度", () => {
    expect(diffDays(null, "2026-03-21")).toBe(1);
  });
});

describe("normalizeWorkItem", () => {
  it("缺少開始日應使用截止日作 fallback", () => {
    const item: WorkItem = {
      id: "issue-1",
      issueNumber: 1,
      issueUrl: "https://github.com/example/repo/issues/1",
      title: "fallback",
      status: "todo",
      priority: "High",
      milestone: null,
      assignees: [],
      projectItemId: "item-1",
      projectId: "project-1",
      startDate: null,
      targetDate: "2026-03-21",
      durationDays: 0,
      progressState: "at-risk",
      blockedReason: "",
      linkedPrs: [],
      labels: [],
      updatedAt: "2026-03-12T00:00:00Z"
    };

    const normalized = normalizeWorkItem(item);

    expect(normalized.startDate).toBe("2026-03-21");
    expect(normalized.targetDate).toBe("2026-03-21");
    expect(normalized.durationDays).toBe(1);
  });
});
