import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { getRepositoryContext, githubGraphql } from "./lib/github.mjs";

const projectDataPath = path.resolve("public", "project-data.json");

/**
 * 載入目前的靜態快照，作為無法讀取 GitHub Project 時的 fallback。
 */
function readCurrentSnapshot() {
  const current = JSON.parse(fs.readFileSync(projectDataPath, "utf8"));
  current.generatedAt = new Date().toISOString();
  return current;
}

function pickFieldValue(fieldValues, fieldName) {
  return fieldValues.find((node) => node.field?.name === fieldName) ?? null;
}

function toWorkItem(node, projectId) {
  const issue = node.content;
  const statusValue = pickFieldValue(node.fieldValues.nodes, "Status");
  const startDateValue = pickFieldValue(node.fieldValues.nodes, "Start date");
  const targetDateValue = pickFieldValue(node.fieldValues.nodes, "Target date");
  const priorityValue = pickFieldValue(node.fieldValues.nodes, "Priority");

  return {
    id: `issue-${issue.number}`,
    issueNumber: issue.number,
    issueUrl: issue.url,
    title: issue.title,
    status: statusValue?.name ?? "todo",
    priority: priorityValue?.name ?? "",
    milestone: issue.milestone?.title ?? null,
    assignees: issue.assignees.nodes.map((assignee) => ({
      login: assignee.login,
      name: assignee.name ?? assignee.login,
      avatarUrl: assignee.avatarUrl
    })),
    projectItemId: node.id,
    projectId,
    startDate: startDateValue?.date ?? null,
    targetDate: targetDateValue?.date ?? null,
    durationDays: 1,
    progressState: statusValue?.name === "blocked" ? "blocked" : statusValue?.name === "done" ? "done" : "on-track",
    blockedReason: "",
    linkedPrs: [],
    labels: issue.labels.nodes.map((label) => label.name),
    updatedAt: issue.updatedAt
  };
}

function buildMemberLoad(workItems) {
  const counters = new Map();

  for (const item of workItems) {
    const assignees = item.assignees.length ? item.assignees : [{ login: "unassigned", name: "未指派" }];

    for (const assignee of assignees) {
      const current = counters.get(assignee.login) ?? {
        login: assignee.login,
        name: assignee.name ?? assignee.login,
        todoCount: 0,
        inProgressCount: 0,
        inReviewCount: 0,
        blockedCount: 0
      };

      if (item.status === "todo") {
        current.todoCount += 1;
      }
      if (item.status === "in-progress") {
        current.inProgressCount += 1;
      }
      if (item.status === "in-review") {
        current.inReviewCount += 1;
      }
      if (item.status === "blocked") {
        current.blockedCount += 1;
      }

      counters.set(assignee.login, current);
    }
  }

  return [...counters.values()];
}

function buildSummary(workItems) {
  const totalItems = workItems.length;
  const doneItems = workItems.filter((item) => item.status === "done").length;
  const inProgressItems = workItems.filter((item) => item.status === "in-progress").length;
  const blockedItems = workItems.filter((item) => item.status === "blocked").length;
  const overdueItems = workItems.filter((item) => item.targetDate && item.targetDate < new Date().toISOString().slice(0, 10) && item.status !== "done").length;

  return {
    totalItems,
    doneItems,
    inProgressItems,
    blockedItems,
    overdueItems,
    completionRate: totalItems === 0 ? 0 : Number(((doneItems / totalItems) * 100).toFixed(1))
  };
}

async function fetchProjectSnapshot() {
  const projectId = process.env.PROJECT_ID ?? "";

  if (!projectId) {
    return readCurrentSnapshot();
  }

  try {
    const data = await githubGraphql(
      `
        query GetProjectItems($projectId: ID!) {
          node(id: $projectId) {
            ... on ProjectV2 {
              id
              items(first: 100) {
                nodes {
                  id
                  fieldValues(first: 20) {
                    nodes {
                      ... on ProjectV2ItemFieldDateValue {
                        date
                        field {
                          ... on ProjectV2FieldCommon {
                            name
                          }
                        }
                      }
                      ... on ProjectV2ItemFieldSingleSelectValue {
                        name
                        field {
                          ... on ProjectV2FieldCommon {
                            name
                          }
                        }
                      }
                    }
                  }
                  content {
                    ... on Issue {
                      number
                      title
                      url
                      updatedAt
                      milestone {
                        title
                      }
                      assignees(first: 20) {
                        nodes {
                          login
                          name
                          avatarUrl
                        }
                      }
                      labels(first: 40) {
                        nodes {
                          name
                        }
                      }
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

    const project = data.node;
    const workItems = project.items.nodes.filter((item) => item.content?.number).map((item) => toWorkItem(item, project.id));

    return {
      generatedAt: new Date().toISOString(),
      repository: getRepositoryContext().repository,
      projectId: project.id,
      milestones: [...new Set(workItems.map((item) => item.milestone).filter(Boolean))],
      members: buildMemberLoad(workItems),
      workItems,
      summary: buildSummary(workItems)
    };
  } catch (error) {
    console.warn(
      `[generate-project-data] 無法讀取 GitHub Project，改用現有靜態快照：${error instanceof Error ? error.message : String(error)}`
    );
    return readCurrentSnapshot();
  }
}

/**
 * 產生 project-data.json，若未設定 project env 則保留範例資料。
 */
async function main() {
  const snapshot = await fetchProjectSnapshot();
  fs.writeFileSync(projectDataPath, JSON.stringify(snapshot, null, 2), "utf8");
  console.log(JSON.stringify({ ok: true, output: "public/project-data.json", count: snapshot.workItems.length }, null, 2));
}

await main();
