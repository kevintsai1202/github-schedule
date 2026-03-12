import { afterEach, describe, expect, it, vi } from "vitest";
import { patchSchedule, patchStatus } from "../src/api";

/**
 * 還原每個測試寫入的全域狀態。
 */
afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("api mutation fallback", () => {
  it("未設定 API 時應直接以唯讀模式錯誤結束", async () => {
    vi.stubEnv("VITE_API_BASE_URL", "");
    const fetchSpy = vi.spyOn(globalThis, "fetch");

    await expect(patchStatus("item-1", { status: "done" })).rejects.toThrow(
      "目前為 GitHub Pages 唯讀展示模式，尚未設定可寫入 API。"
    );

    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("API 回傳 HTML 時應提供明確錯誤訊息", async () => {
    vi.stubEnv("VITE_API_BASE_URL", "https://example.com");
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("<html>not found</html>", {
        status: 404,
        headers: {
          "content-type": "text/html"
        }
      })
    );

    await expect(
      patchSchedule("item-1", {
        startDate: "2026-03-14",
        targetDate: "2026-03-18"
      })
    ).rejects.toThrow("更新時程失敗：API 未回傳 JSON，請確認已部署可寫入服務。");
  });
});
