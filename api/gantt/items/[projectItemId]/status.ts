import { GitHubMutationService } from "../../../../api/_lib/github-client";
import { json } from "../../../../api/_lib/json";

/**
 * 更新甘特圖狀態欄位。
 */
export default async function handler(request: Request, context: { params: { projectItemId: string } }): Promise<Response> {
  if (request.method !== "PATCH") {
    return json(405, {
      ok: false,
      error: "只支援 PATCH"
    });
  }

  const { status } = (await request.json()) as { status?: string };

  if (!status) {
    return json(400, {
      ok: false,
      error: "缺少 status"
    });
  }

  try {
    const service = new GitHubMutationService();
    service.ensureConfigured();
    const item = await service.updateStatus(context.params.projectItemId, status);

    return json(200, {
      ok: true,
      item
    });
  } catch (error) {
    return json(500, {
      ok: false,
      error: error instanceof Error ? error.message : "更新狀態失敗"
    });
  }
}
