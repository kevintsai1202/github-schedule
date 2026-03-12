import { GitHubMutationService } from "../../../../api/_lib/github-client";
import { json } from "../../../../api/_lib/json";

/**
 * 更新甘特圖 assignees 欄位。
 */
export default async function handler(request: Request, context: { params: { projectItemId: string } }): Promise<Response> {
  if (request.method !== "PATCH") {
    return json(405, {
      ok: false,
      error: "只支援 PATCH"
    });
  }

  const { assigneeLogins } = (await request.json()) as { assigneeLogins?: string[] };

  if (!assigneeLogins) {
    return json(400, {
      ok: false,
      error: "缺少 assigneeLogins"
    });
  }

  try {
    const service = new GitHubMutationService();
    service.ensureConfigured();
    const item = await service.updateAssignees(context.params.projectItemId, assigneeLogins);

    return json(200, {
      ok: true,
      item
    });
  } catch (error) {
    return json(500, {
      ok: false,
      error: error instanceof Error ? error.message : "更新負責人失敗"
    });
  }
}
