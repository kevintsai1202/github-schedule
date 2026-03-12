/**
 * 依欄位名稱建立 GitHub Variables 鍵值映射。
 */
export function buildVariableEntries(projectId, repository, fields) {
  const findField = (name) => fields.find((field) => field.name === name);
  const statusField = findField("Status");
  const startDateField = findField("Start date");
  const targetDateField = findField("Target date");

  const entries = [
    ["GITHUB_REPOSITORY_NAME", repository],
    ["GITHUB_PROJECT_ID", projectId],
    ["GITHUB_PROJECT_STATUS_FIELD_ID", statusField?.id ?? ""],
    ["GITHUB_PROJECT_START_DATE_FIELD_ID", startDateField?.id ?? ""],
    ["GITHUB_PROJECT_TARGET_DATE_FIELD_ID", targetDateField?.id ?? ""],
    ["GITHUB_PROJECT_STATUS_TODO_OPTION_ID", findStatusOptionId(statusField, ["Todo", "todo"])],
    ["GITHUB_PROJECT_STATUS_IN_PROGRESS_OPTION_ID", findStatusOptionId(statusField, ["In Progress", "in-progress"])],
    ["GITHUB_PROJECT_STATUS_IN_REVIEW_OPTION_ID", findStatusOptionId(statusField, ["In Review", "in-review"])],
    ["GITHUB_PROJECT_STATUS_DONE_OPTION_ID", findStatusOptionId(statusField, ["Done", "done"])],
    ["GITHUB_PROJECT_STATUS_BLOCKED_OPTION_ID", findStatusOptionId(statusField, ["Blocked", "blocked"])]
  ];

  return entries;
}

/**
 * 尋找 Status 欄位下對應名稱的 option id。
 */
export function findStatusOptionId(statusField, names) {
  if (!statusField?.options?.length) {
    return "";
  }

  const normalizedNames = names.map((name) => name.toLowerCase());
  const option = statusField.options.find((item) => normalizedNames.includes(String(item.name).toLowerCase()));
  return option?.id ?? "";
}

/**
 * 將變數轉成可直接貼上的文字。
 */
export function formatVariableLines(entries) {
  return entries.map(([key, value]) => `${key}=${value ?? ""}`).join("\n");
}

/**
 * 產生 PowerShell 的 gh variable set 指令。
 */
export function formatGhVariableCommands(entries, repository) {
  return entries
    .map(([key, value]) => `gh variable set ${key} --repo ${repository} --body "${String(value ?? "").replace(/"/g, '\\"')}"`)
    .join("\n");
}
