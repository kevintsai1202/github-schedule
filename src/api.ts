import type {
  GanttAssigneePayload,
  GanttSchedulePayload,
  GanttStatusPayload,
  ProjectSnapshot,
  WorkItem
} from "./types";

/**
 * 載入靜態快照，並主動避開舊快取。
 */
export async function fetchProjectSnapshot(): Promise<ProjectSnapshot> {
  const version = Date.now();
  const response = await fetch(`/project-data.json?v=${version}`, {
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
  const response = await fetch(`/api/gantt/items/${projectItemId}/schedule`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  const body = (await response.json()) as { ok: boolean; item?: Partial<WorkItem>; error?: string };

  if (!response.ok || !body.ok || !body.item) {
    throw new Error(body.error ?? "更新時程失敗");
  }

  return body.item;
}

/**
 * 呼叫 status mutation API。
 */
export async function patchStatus(projectItemId: string, payload: GanttStatusPayload): Promise<Partial<WorkItem>> {
  const response = await fetch(`/api/gantt/items/${projectItemId}/status`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  const body = (await response.json()) as { ok: boolean; item?: Partial<WorkItem>; error?: string };

  if (!response.ok || !body.ok || !body.item) {
    throw new Error(body.error ?? "更新狀態失敗");
  }

  return body.item;
}

/**
 * 呼叫 assignee mutation API。
 */
export async function patchAssignees(projectItemId: string, payload: GanttAssigneePayload): Promise<Partial<WorkItem>> {
  const response = await fetch(`/api/gantt/items/${projectItemId}/assignees`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  const body = (await response.json()) as { ok: boolean; item?: Partial<WorkItem>; error?: string };

  if (!response.ok || !body.ok || !body.item) {
    throw new Error(body.error ?? "更新負責人失敗");
  }

  return body.item;
}
