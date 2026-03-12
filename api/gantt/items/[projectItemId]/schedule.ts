import { GitHubMutationService } from "../../../../api/_lib/github-client";
import { json } from "../../../../api/_lib/json";

/**
 * 更新甘特圖時程欄位。
 */
export default async function handler(request: Request, context: { params: { projectItemId: string } }): Promise<Response> {
  if (request.method !== "PATCH") {
    return json(405, {
      ok: false,
      error: "只支援 PATCH"
    });
  }

  const { startDate, targetDate } = (await request.json()) as { startDate?: string | null; targetDate?: string | null };

  if (startDate && targetDate && targetDate < startDate) {
    return json(400, {
      ok: false,
      error: "targetDate 不可早於 startDate"
    });
  }

  if (startDate === undefined && targetDate === undefined) {
    return json(400, {
      ok: false,
      error: "至少要提供 startDate 或 targetDate"
    });
  }

  try {
    const service = new GitHubMutationService();
    service.ensureConfigured();
    const item = await service.updateSchedule(context.params.projectItemId, startDate, targetDate);

    return json(200, {
      ok: true,
      item
    });
  } catch (error) {
    return json(500, {
      ok: false,
      error: error instanceof Error ? error.message : "更新時程失敗"
    });
  }
}
