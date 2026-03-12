import type {
  GanttAssigneePayload,
  GanttSchedulePayload,
  GanttStatusPayload,
  ProjectSnapshot,
  WorkItem
} from "./types";

/**
 * 回傳是否已設定可寫入 API。
 */
export function isMutationApiConfigured(): boolean {
  return Boolean(import.meta.env.VITE_API_BASE_URL);
}

/**
 * 將 API 路徑組合成完整網址。
 */
function buildMutationUrl(pathname: string): URL {
  const configuredBaseUrl = import.meta.env.VITE_API_BASE_URL;

  if (!configuredBaseUrl) {
    throw new Error("目前為 GitHub Pages 唯讀展示模式，尚未設定可寫入 API。");
  }

  return new URL(pathname.replace(/^\//, ""), ensureTrailingSlash(configuredBaseUrl));
}

/**
 * 將基底網址補成結尾斜線，避免 URL 拼接錯誤。
 */
function ensureTrailingSlash(value: string): string {
  return value.endsWith("/") ? value : `${value}/`;
}

/**
 * 解析 mutation API 回應，避免將 HTML 錯誤頁當成 JSON。
 */
async function parseMutationResponse(
  response: Response,
  fallbackMessage: string
): Promise<{ ok: boolean; item?: Partial<WorkItem>; error?: string }> {
  const contentType = response.headers.get("content-type") ?? "";
  const rawText = await response.text();

  if (!contentType.includes("application/json")) {
    throw new Error(`${fallbackMessage}：API 未回傳 JSON，請確認已部署可寫入服務。`);
  }

  try {
    return JSON.parse(rawText) as { ok: boolean; item?: Partial<WorkItem>; error?: string };
  } catch {
    throw new Error(`${fallbackMessage}：API 回應格式無法解析。`);
  }
}

/**
 * 載入靜態快照，並主動避開舊快取。
 */
export async function fetchProjectSnapshot(): Promise<ProjectSnapshot> {
  const version = Date.now();
  const baseUrl = new URL(import.meta.env.BASE_URL, window.location.origin);
  const response = await fetch(new URL(`project-data.json?v=${version}`, baseUrl), {
    cache: "no-store"
  });

  if (!response.ok) {
    throw new Error(`載入 project-data.json 失敗：${response.status}`);
  }

  return response.json() as Promise<ProjectSnapshot>;
}

/**
 * 呼叫 schedule mutation API。
 */
export async function patchSchedule(projectItemId: string, payload: GanttSchedulePayload): Promise<Partial<WorkItem>> {
  const response = await fetch(buildMutationUrl(`/api/gantt/items/${projectItemId}/schedule`), {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  const body = await parseMutationResponse(response, "更新時程失敗");

  if (!response.ok || !body.ok || !body.item) {
    throw new Error(body.error ?? "更新時程失敗");
  }

  return body.item;
}

/**
 * 呼叫 status mutation API。
 */
export async function patchStatus(projectItemId: string, payload: GanttStatusPayload): Promise<Partial<WorkItem>> {
  const response = await fetch(buildMutationUrl(`/api/gantt/items/${projectItemId}/status`), {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  const body = await parseMutationResponse(response, "更新狀態失敗");

  if (!response.ok || !body.ok || !body.item) {
    throw new Error(body.error ?? "更新狀態失敗");
  }

  return body.item;
}

/**
 * 呼叫 assignee mutation API。
 */
export async function patchAssignees(projectItemId: string, payload: GanttAssigneePayload): Promise<Partial<WorkItem>> {
  const response = await fetch(buildMutationUrl(`/api/gantt/items/${projectItemId}/assignees`), {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  const body = await parseMutationResponse(response, "更新負責人失敗");

  if (!response.ok || !body.ok || !body.item) {
    throw new Error(body.error ?? "更新負責人失敗");
  }

  return body.item;
}
