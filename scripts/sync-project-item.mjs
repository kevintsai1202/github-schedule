import fs from "node:fs";
import process from "node:process";
import { syncIssueIntoProject } from "./lib/project-sync.mjs";

/**
 * 處理 Issue 事件，將新任務加入 Project 並套用欄位。
 */
async function main() {
  const eventPath = process.env.GITHUB_EVENT_PATH ?? "";
  const payload = JSON.parse(fs.readFileSync(eventPath, "utf8"));
  const issue = payload.issue;
  const action = payload.action;

  if (!issue) {
    throw new Error("找不到 issue payload");
  }

  const result = await syncIssueIntoProject(issue);
  console.log(JSON.stringify({ ok: true, action, issueNumber: issue.number, ...result }, null, 2));
}

await main();
