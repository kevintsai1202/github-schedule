import fs from "node:fs";
import process from "node:process";
import { extractLinkedIssueNumbers, githubGraphql } from "./lib/github.mjs";
import { getIssueForProjectItem, syncIssueStatusLabel, updateProjectStatusField } from "./lib/project-sync.mjs";

async function getProjectItemByIssueNumber(issueNumber) {
  const projectId = process.env.PROJECT_ID ?? "";
  const data = await githubGraphql(
    `
      query FindProjectItem($projectId: ID!) {
        node(id: $projectId) {
          ... on ProjectV2 {
            items(first: 100) {
              nodes {
                id
                content {
                  ... on Issue {
                    number
                  }
                }
              }
            }
          }
        }
      }
    `,
    {
      projectId
    }
  );

  return data.node.items.nodes.find((item) => item.content?.number === issueNumber) ?? null;
}

async function syncIssueStatus(issueNumber, status) {
  const item = await getProjectItemByIssueNumber(issueNumber);

  if (!item) {
    return {
      issueNumber,
      skipped: true
    };
  }

  await updateProjectStatusField(item.id, status);
  const issue = await getIssueForProjectItem(item.id);
  const labels = await syncIssueStatusLabel(issue.number, status, issue.labels.nodes.map((label) => label.name));

  return {
    issueNumber,
    projectItemId: item.id,
    status,
    labels
  };
}

/**
 * 依 PR 事件同步關聯 Issue 狀態。
 */
async function main() {
  const eventPath = process.env.GITHUB_EVENT_PATH ?? "";
  const payload = JSON.parse(fs.readFileSync(eventPath, "utf8"));
  const action = payload.action;
  const pullRequest = payload.pull_request;
  const linkedIssues = extractLinkedIssueNumbers(`${pullRequest.body ?? ""}\n${pullRequest.title ?? ""}`);
  const nextStatus =
    action === "closed" ? (pullRequest.merged ? "done" : "in-progress") : "in-review";
  const results = [];

  for (const issueNumber of linkedIssues) {
    results.push(await syncIssueStatus(issueNumber, nextStatus));
  }

  console.log(JSON.stringify({ ok: true, action, nextStatus, results }, null, 2));
}

await main();
