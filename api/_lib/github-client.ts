interface ProjectFieldIds {
  projectId: string;
  statusFieldId: string;
  startDateFieldId: string;
  targetDateFieldId: string;
}

interface IssueSnapshot {
  number: number;
  repository: {
    nameWithOwner: string;
  };
  labels: {
    nodes: Array<{ name: string }>;
  };
}

/**
 * GitHub 寫入服務，負責 Project v2 欄位與 Issue 同步。
 */
export class GitHubMutationService {
  private readonly token: string;

  private readonly repository: string;

  private readonly fields: ProjectFieldIds;

  constructor() {
    this.token = process.env.GITHUB_APP_TOKEN ?? process.env.GITHUB_TOKEN ?? "";
    this.repository = process.env.PROJECT_REPOSITORY_NAME ?? "";
    this.fields = {
      projectId: process.env.PROJECT_ID ?? "",
      statusFieldId: process.env.PROJECT_STATUS_FIELD_ID ?? "",
      startDateFieldId: process.env.PROJECT_START_DATE_FIELD_ID ?? "",
      targetDateFieldId: process.env.PROJECT_TARGET_DATE_FIELD_ID ?? ""
    };
  }

  /**
   * 更新 Project 日期欄位。
   */
  async updateSchedule(projectItemId: string, startDate?: string | null, targetDate?: string | null) {
    if (startDate !== undefined) {
      await this.updateDateField(projectItemId, this.fields.startDateFieldId, startDate);
    }

    if (targetDate !== undefined) {
      await this.updateDateField(projectItemId, this.fields.targetDateFieldId, targetDate);
    }

    return {
      projectItemId,
      startDate: startDate ?? null,
      targetDate: targetDate ?? null
    };
  }

  /**
   * 更新 Project 狀態欄位並同步 Issue status label。
   */
  async updateStatus(projectItemId: string, status: string) {
    const issue = await this.getIssueForProjectItem(projectItemId);
    await this.updateSingleSelectField(projectItemId, this.fields.statusFieldId, this.getStatusOptionId(status));
    const labels = await this.syncIssueStatusLabel(issue.number, status, issue.labels.nodes.map((label) => label.name));

    return {
      projectItemId,
      status,
      labels
    };
  }

  /**
   * 同步 Issue assignees，並將其視為 Project 的 assignee 真相。
   */
  async updateAssignees(projectItemId: string, assigneeLogins: string[]) {
    const issue = await this.getIssueForProjectItem(projectItemId);
    await this.patchIssue(issue.number, {
      assignees: assigneeLogins
    });

    return {
      projectItemId,
      assignees: assigneeLogins.map((login) => ({
        login,
        name: login
      }))
    };
  }

  /**
   * 檢查必要環境變數。
   */
  ensureConfigured(): void {
    if (!this.token) {
      throw new Error("缺少 GITHUB_APP_TOKEN 或 GITHUB_TOKEN");
    }

    if (!this.repository) {
      throw new Error("缺少 PROJECT_REPOSITORY_NAME");
    }

    if (!this.fields.projectId) {
      throw new Error("缺少 PROJECT_ID");
    }
  }

  /**
   * 呼叫 GraphQL 更新日期欄位。
   */
  private async updateDateField(projectItemId: string, fieldId: string, value?: string | null): Promise<void> {
    if (!fieldId || value === undefined) {
      return;
    }

    await this.graphql(
      `
        mutation UpdateDateField($projectId: ID!, $itemId: ID!, $fieldId: ID!, $value: Date) {
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
        projectId: this.fields.projectId,
        itemId: projectItemId,
        fieldId,
        value: value ?? null
      }
    );
  }

  /**
   * 更新單選欄位。
   */
  private async updateSingleSelectField(projectItemId: string, fieldId: string, optionId: string): Promise<void> {
    if (!fieldId || !optionId) {
      throw new Error("缺少 status field id 或 option id");
    }

    await this.graphql(
      `
        mutation UpdateSingleSelectField($projectId: ID!, $itemId: ID!, $fieldId: ID!, $optionId: String!) {
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
        projectId: this.fields.projectId,
        itemId: projectItemId,
        fieldId,
        optionId
      }
    );
  }

  /**
   * 依 project item 取得其對應 Issue。
   */
  private async getIssueForProjectItem(projectItemId: string): Promise<IssueSnapshot> {
    const data = await this.graphql(
      `
        query GetProjectItemIssue($itemId: ID!) {
          node(id: $itemId) {
            ... on ProjectV2Item {
              content {
                ... on Issue {
                  number
                  repository {
                    nameWithOwner
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
      `,
      {
        itemId: projectItemId
      }
    );

    const issue = (data as { node?: { content?: IssueSnapshot } }).node?.content;

    if (!issue) {
      throw new Error("找不到 project item 對應的 Issue");
    }

    return issue;
  }

  /**
   * 同步 Issue status label。
   */
  private async syncIssueStatusLabel(issueNumber: number, status: string, currentLabels: string[]): Promise<string[]> {
    const labels = currentLabels.filter((label) => !label.startsWith("status:"));
    labels.push(`status:${status}`);
    await this.patchIssue(issueNumber, { labels });
    return labels;
  }

  /**
   * 更新 Issue。
   */
  private async patchIssue(issueNumber: number, body: Record<string, unknown>): Promise<unknown> {
    const [owner, repo] = this.repository.split("/");
    const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/issues/${issueNumber}`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${this.token}`,
        Accept: "application/vnd.github+json",
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      throw new Error(`GitHub Issue 更新失敗：${response.status}`);
    }

    return response.json();
  }

  /**
   * 讀取 status 對應 option id。
   */
  private getStatusOptionId(status: string): string {
    const mapping: Record<string, string> = {
      todo: process.env.PROJECT_STATUS_TODO_OPTION_ID ?? "",
      "in-progress": process.env.PROJECT_STATUS_IN_PROGRESS_OPTION_ID ?? "",
      "in-review": process.env.PROJECT_STATUS_IN_REVIEW_OPTION_ID ?? "",
      done: process.env.PROJECT_STATUS_DONE_OPTION_ID ?? "",
      blocked: process.env.PROJECT_STATUS_BLOCKED_OPTION_ID ?? ""
    };

    const optionId = mapping[status];

    if (!optionId) {
      throw new Error(`找不到 status=${status} 的 option id 環境變數`);
    }

    return optionId;
  }

  /**
   * 共用 GraphQL request。
   */
  private async graphql(query: string, variables: Record<string, unknown>): Promise<unknown> {
    const response = await fetch("https://api.github.com/graphql", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ query, variables })
    });

    if (!response.ok) {
      throw new Error(`GitHub GraphQL 呼叫失敗：${response.status}`);
    }

    const body = (await response.json()) as { errors?: Array<{ message: string }>; data?: unknown };

    if (body.errors?.length) {
      throw new Error(body.errors.map((error) => error.message).join(" | "));
    }

    return body.data;
  }
}
