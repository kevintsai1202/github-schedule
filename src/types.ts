export interface Assignee {
  login: string;
  name?: string;
  avatarUrl?: string;
}

export interface PullRequestLink {
  number: number;
  title: string;
  url: string;
  state: "open" | "closed" | "merged";
}

export interface WorkItem {
  id: string;
  issueNumber: number;
  issueUrl: string;
  title: string;
  status: string;
  priority?: string;
  milestone: string | null;
  assignees: Assignee[];
  projectItemId: string;
  projectId: string;
  startDate: string | null;
  targetDate: string | null;
  durationDays: number;
  progressState: string;
  blockedReason?: string;
  linkedPrs: PullRequestLink[];
  labels: string[];
  updatedAt: string;
}

export interface MemberLoad {
  login: string;
  name?: string;
  todoCount: number;
  inProgressCount: number;
  inReviewCount: number;
  blockedCount: number;
}

export interface ProjectSummary {
  totalItems: number;
  doneItems: number;
  inProgressItems: number;
  blockedItems: number;
  overdueItems: number;
  completionRate: number;
}

export interface ProjectSnapshot {
  generatedAt: string;
  repository: string;
  projectId: string;
  milestones: string[];
  members: MemberLoad[];
  workItems: WorkItem[];
  summary: ProjectSummary;
}

export interface GanttSchedulePayload {
  startDate?: string | null;
  targetDate?: string | null;
}

export interface GanttStatusPayload {
  status: string;
}

export interface GanttAssigneePayload {
  assigneeLogins: string[];
}
