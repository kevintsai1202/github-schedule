import { describe, expect, it } from "vitest";
import { extractIssueSection, extractLinkedIssueNumbers, mergeStatusLabel } from "../scripts/lib/github.mjs";

describe("extractIssueSection", () => {
  it("應從 issue body 抽出指定區段", () => {
    const body = `### 說明
建立甘特圖

### 預計開始日
2026-03-16

### 預計截止日
2026-03-21`;

    expect(extractIssueSection(body, "預計開始日")).toBe("2026-03-16");
    expect(extractIssueSection(body, "預計截止日")).toBe("2026-03-21");
  });
});

describe("extractLinkedIssueNumbers", () => {
  it("應去重並抽出 PR 文字中的 issue number", () => {
    expect(extractLinkedIssueNumbers("Closes #12 and refs #12, #30")).toEqual([12, 30]);
  });
});

describe("mergeStatusLabel", () => {
  it("應替換舊 status label 並保留其他 labels", () => {
    expect(mergeStatusLabel(["status:todo", "type:task"], "done")).toEqual(["type:task", "status:done"]);
  });
});
