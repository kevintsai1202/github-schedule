import type { ProjectSnapshot, WorkItem } from "./types";
import { normalizeWorkItem } from "./utils";

/**
 * 儲存前端目前載入的快照與 optimistic mutation。
 */
export class DashboardStore {
  private snapshot: ProjectSnapshot | null = null;

  setSnapshot(snapshot: ProjectSnapshot): void {
    this.snapshot = {
      ...snapshot,
      workItems: snapshot.workItems.map(normalizeWorkItem)
    };
  }

  getSnapshot(): ProjectSnapshot {
    if (!this.snapshot) {
      throw new Error("尚未載入 project snapshot");
    }

    return this.snapshot;
  }

  updateWorkItem(projectItemId: string, patch: Partial<WorkItem>): ProjectSnapshot {
    if (!this.snapshot) {
      throw new Error("尚未載入 project snapshot");
    }

    this.snapshot = {
      ...this.snapshot,
      workItems: this.snapshot.workItems.map((item) =>
        item.projectItemId === projectItemId ? normalizeWorkItem({ ...item, ...patch }) : item
      )
    };

    return this.snapshot;
  }
}
