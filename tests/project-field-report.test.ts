import { describe, expect, it } from "vitest";
import {
  buildVariableEntries,
  findStatusOptionId,
  formatGhVariableCommands,
  formatVariableLines
} from "../scripts/lib/project-field-report.mjs";

describe("project field report", () => {
  const fields = [
    {
      id: "field-status",
      name: "Status",
      dataType: "SINGLE_SELECT",
      options: [
        { id: "opt-todo", name: "Todo" },
        { id: "opt-progress", name: "In Progress" },
        { id: "opt-review", name: "In Review" },
        { id: "opt-done", name: "Done" },
        { id: "opt-blocked", name: "Blocked" }
      ]
    },
    {
      id: "field-start",
      name: "Start date",
      dataType: "DATE",
      options: []
    },
    {
      id: "field-target",
      name: "Target date",
      dataType: "DATE",
      options: []
    }
  ];

  it("應找到對應 status option id", () => {
    expect(findStatusOptionId(fields[0], ["Done"])).toBe("opt-done");
  });

  it("應建立完整 variables 清單", () => {
    const entries = buildVariableEntries("project-1", "owner/repo", fields);
    expect(Object.fromEntries(entries).PROJECT_STATUS_IN_REVIEW_OPTION_ID).toBe("opt-review");
  });

  it("應輸出可貼上的變數文字與 gh 指令", () => {
    const entries = buildVariableEntries("project-1", "owner/repo", fields);
    expect(formatVariableLines(entries)).toContain("PROJECT_ID=project-1");
    expect(formatGhVariableCommands(entries, "owner/repo")).toContain("gh variable set PROJECT_ID --repo owner/repo");
  });
});
