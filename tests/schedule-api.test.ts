import { describe, expect, it, vi } from "vitest";

vi.mock("../api/_lib/github-client", () => ({
  GitHubMutationService: class {
    ensureConfigured() {}

    async updateSchedule(projectItemId: string, startDate?: string | null, targetDate?: string | null) {
      return {
        projectItemId,
        startDate: startDate ?? null,
        targetDate: targetDate ?? null
      };
    }
  }
}));

import scheduleHandler from "../api/gantt/items/[projectItemId]/schedule";

describe("schedule handler", () => {
  it("targetDate 早於 startDate 時應回傳 400", async () => {
    const request = new Request("http://localhost/api/gantt/items/demo/schedule", {
      method: "PATCH",
      body: JSON.stringify({
        startDate: "2026-03-20",
        targetDate: "2026-03-16"
      })
    });

    const response = await scheduleHandler(request, {
      params: {
        projectItemId: "demo"
      }
    });

    expect(response.status).toBe(400);
  });

  it("合法 payload 應回傳 200", async () => {
    const request = new Request("http://localhost/api/gantt/items/demo/schedule", {
      method: "PATCH",
      body: JSON.stringify({
        startDate: "2026-03-16",
        targetDate: "2026-03-20"
      })
    });

    const response = await scheduleHandler(request, {
      params: {
        projectItemId: "demo"
      }
    });
    const body = (await response.json()) as { ok: boolean; item: { projectItemId: string } };

    expect(response.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.item.projectItemId).toBe("demo");
  });
});
