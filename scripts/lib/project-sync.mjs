import {
  extractIssueSection,
  getRepositoryContext,
  getStatusOptionMap,
  githubGraphql,
  githubRest,
  mergeStatusLabel
} from "./github.mjs";

function getProjectEnv() {
  return {
    projectId: process.env.GITHUB_PROJECT_ID ?? "",
    statusFieldId: process.env.GITHUB_PROJECT_STATUS_FIELD_ID ?? "",
    startDateFieldId: process.env.GITHUB_PROJECT_START_DATE_FIELD_ID ?? "",
    targetDateFieldId: process.env.GITHUB_PROJECT_TARGET_DATE_FIELD_ID ?? ""
  };
}

/**
 * 將 Issue 加入 Project。
 */
export async function addIssueToProject(issueNodeId) {
  const { projectId } = getProjectEnv();

  const data = await githubGraphql(
    `
      mutation AddItem($projectId: ID!, $contentId: ID!) {
        addProjectV2ItemById(input: { projectId: $projectId, contentId: $contentId }) {
          item {
            id
          }
        }
      }
    `,
    {
      projectId,
      contentId: issueNodeId
    }
  );

  return data.addProjectV2ItemById.item;
}

/**
 * 查詢 issue 是否已存在於 project。
 */
export async function findProjectItemByIssueNodeId(issueNodeId) {
  const { projectId } = getProjectEnv();
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
                    id
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

  return data.node.items.nodes.find((node) => node.content?.id === issueNodeId) ?? null;
}

/**
 * 更新 Project 日期欄位。
 */
export async function updateProjectDateField(projectItemId, fieldId, value) {
  if (!fieldId || !value) {
    return;
  }

  await githubGraphql(
    `
      mutation UpdateDateField($projectId: ID!, $itemId: ID!, $fieldId: ID!, $value: Date!) {
        updateProjectV2ItemFieldValue(
          input: {
            projectId: $projectId
            itemId: $itemId
            fieldId: $fieldId
            value: { date: $value }
          }
        ) {
          projectV2Item {
            id
          }
        }
      }
    `,
    {
      projectId: getProjectEnv().projectId,
      itemId: projectItemId,
      fieldId,
      value
    }
  );
}

/**
 * 更新 Project 狀態欄位。
 */
export async function updateProjectStatusField(projectItemId, status) {
  const { statusFieldId, projectId } = getProjectEnv();
  const optionId = getStatusOptionMap()[status];

  if (!statusFieldId || !optionId) {
    throw new Error(`找不到 status=${status} 對應的 option id`);
  }

  await githubGraphql(
    `
      mutation UpdateStatusField($projectId: ID!, $itemId: ID!, $fieldId: ID!, $optionId: String!) {
        updateProjectV2ItemFieldValue(
          input: {
            projectId: $projectId
            itemId: $itemId
            fieldId: $fieldId
            value: { singleSelectOptionId: $optionId }
          }
        ) {
          projectV2Item {
            id
          }
        }
      }
    `,
    {
      projectId,
      itemId: projectItemId,
      fieldId: statusFieldId,
      optionId
    }
  );
}

/**
 * 依 project item 讀取 issue 基本資訊。
 */
export async function getIssueForProjectItem(projectItemId) {
  const data = await githubGraphql(
    `
      query GetProjectItem($itemId: ID!) {
        node(id: $itemId) {
          ... on ProjectV2Item {
            id
            content {
              ... on Issue {
                id
                number
                title
                body
                url
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
                repository {
                  nameWithOwner
                }
              }
            }
          }
        }
      }
    `,
    {
      itemId: projectItemId
    }
  );

  return data.node?.content ?? null;
}

/**
 * 同步 Issue labels。
 */
export async function syncIssueStatusLabel(issueNumber, status, currentLabels) {
  const { owner, repo } = getRepositoryContext();
  const labels = mergeStatusLabel(currentLabels, status);

  await githubRest(`/repos/${owner}/${repo}/issues/${issueNumber}`, {
    method: "PATCH",
    body: JSON.stringify({
      labels
    })
  });

  return labels;
}

/**
 * 同步 Issue assignees。
 */
export async function syncIssueAssignees(issueNumber, assigneeLogins) {
  const { owner, repo } = getRepositoryContext();

  await githubRest(`/repos/${owner}/${repo}/issues/${issueNumber}`, {
    method: "PATCH",
    body: JSON.stringify({
      assignees: assigneeLogins
    })
  });
}

/**
 * 處理 issue 事件，加入 project 並套用初始欄位。
 */
export async function syncIssueIntoProject(issuePayload) {
  const existingItem = await findProjectItemByIssueNodeId(issuePayload.node_id);
  const item = existingItem ?? (await addIssueToProject(issuePayload.node_id));
  const { startDateFieldId, targetDateFieldId } = getProjectEnv();
  const startDate = extractIssueSection(issuePayload.body ?? "", "預計開始日");
  const targetDate = extractIssueSection(issuePayload.body ?? "", "預計截止日");

  await updateProjectStatusField(item.id, "todo");
  await updateProjectDateField(item.id, startDateFieldId, startDate);
  await updateProjectDateField(item.id, targetDateFieldId, targetDate);

  return {
    projectItemId: item.id,
    startDate,
    targetDate
  };
}
