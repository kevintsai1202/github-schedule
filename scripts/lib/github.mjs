import process from "node:process";

/**
 * 解析 owner/repo，供 REST API 共用。
 */
export function getRepositoryContext() {
  const repository = process.env.GITHUB_REPOSITORY_NAME ?? process.env.GITHUB_REPOSITORY ?? "";

  if (!repository.includes("/")) {
    throw new Error("缺少有效的 GITHUB_REPOSITORY_NAME 或 GITHUB_REPOSITORY");
  }

  const [owner, repo] = repository.split("/");
  return {
    repository,
    owner,
    repo
  };
}

/**
 * 取得 GitHub token。
 */
export function getGitHubToken() {
  const token = process.env.GITHUB_APP_TOKEN ?? process.env.GITHUB_TOKEN ?? "";

  if (!token) {
    throw new Error("缺少 GITHUB_APP_TOKEN 或 GITHUB_TOKEN");
  }

  return token;
}

/**
 * 發送 GitHub GraphQL 請求。
 */
export async function githubGraphql(query, variables = {}) {
  const response = await fetch("https://api.github.com/graphql", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${getGitHubToken()}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      query,
      variables
    })
  });

  if (!response.ok) {
    throw new Error(`GitHub GraphQL 呼叫失敗：${response.status}`);
  }

  const body = await response.json();

  if (body.errors?.length) {
    throw new Error(body.errors.map((error) => error.message).join(" | "));
  }

  return body.data;
}

/**
 * 發送 GitHub REST 請求。
 */
export async function githubRest(pathname, options = {}) {
  const response = await fetch(`https://api.github.com${pathname}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${getGitHubToken()}`,
      Accept: "application/vnd.github+json",
      "Content-Type": "application/json",
      ...(options.headers ?? {})
    }
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`GitHub REST 呼叫失敗：${response.status} ${text}`);
  }

  if (response.status === 204) {
    return null;
  }

  return response.json();
}

/**
 * 解析 status option id 映射。
 */
export function getStatusOptionMap() {
  return {
    todo: process.env.GITHUB_PROJECT_STATUS_TODO_OPTION_ID ?? "",
    "in-progress": process.env.GITHUB_PROJECT_STATUS_IN_PROGRESS_OPTION_ID ?? "",
    "in-review": process.env.GITHUB_PROJECT_STATUS_IN_REVIEW_OPTION_ID ?? "",
    done: process.env.GITHUB_PROJECT_STATUS_DONE_OPTION_ID ?? "",
    blocked: process.env.GITHUB_PROJECT_STATUS_BLOCKED_OPTION_ID ?? ""
  };
}

/**
 * 將 issue body 中的 section 抽出。
 */
export function extractIssueSection(body, sectionName) {
  const matcher = new RegExp(`###\\s+${sectionName}\\s*\\n([\\s\\S]*?)(?=\\n###\\s+|$)`, "m");
  const match = body.match(matcher);
  return match ? match[1].trim() : "";
}

/**
 * 從文字中抽出關聯 issue number。
 */
export function extractLinkedIssueNumbers(text) {
  const matches = text.match(/#(\d+)/g) ?? [];
  return [...new Set(matches.map((token) => Number(token.slice(1))))];
}

/**
 * 建立或更新 status label。
 */
export function mergeStatusLabel(labels, status) {
  const next = labels.filter((label) => !label.startsWith("status:"));
  next.push(`status:${status}`);
  return next;
}
