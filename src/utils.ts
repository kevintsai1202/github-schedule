import type { WorkItem } from "./types";

/**
 * 將日期字串轉成本地日期物件，便於 UI 計算。
 */
export function parseDate(value: string | null): Date | null {
  if (!value) {
    return null;
  }

  const parsed = new Date(`${value}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

/**
 * 計算兩日期之間的天數差，含起始日。
 */
export function diffDays(start: string | null, end: string | null): number {
  const startDate = parseDate(start);
  const endDate = parseDate(end);

  if (!startDate || !endDate) {
    return 1;
  }

  const milliseconds = endDate.getTime() - startDate.getTime();
  return Math.max(1, Math.floor(milliseconds / 86400000) + 1);
}

/**
 * 正規化工作項目的 duration 與 fallback 日期。
 */
export function normalizeWorkItem(item: WorkItem): WorkItem {
  const fallbackStart = item.startDate ?? item.targetDate;
  const fallbackTarget = item.targetDate ?? item.startDate;

  return {
    ...item,
    startDate: fallbackStart,
    targetDate: fallbackTarget,
    durationDays: diffDays(fallbackStart, fallbackTarget)
  };
}

/**
 * 依狀態回傳 UI 顏色類別。
 */
export function statusToken(status: string): string {
  switch (status) {
    case "done":
      return "is-done";
    case "in-review":
      return "is-review";
    case "blocked":
      return "is-blocked";
    case "in-progress":
      return "is-progress";
    default:
      return "is-todo";
  }
}

/**
 * 將字串截斷，避免卡片排版過長。
 */
export function truncate(value: string, max = 90): string {
  return value.length > max ? `${value.slice(0, max - 1)}…` : value;
}

/**
 * 取得工作項目時間範圍。
 */
export function getDateRange(items: WorkItem[]): { start: Date; end: Date } {
  const dates = items.flatMap((item) => [parseDate(item.startDate), parseDate(item.targetDate)]).filter(Boolean) as Date[];
  const now = new Date();

  if (dates.length === 0) {
    return {
      start: new Date(now.getFullYear(), now.getMonth(), now.getDate() - 3),
      end: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 14)
    };
  }

  dates.sort((left, right) => left.getTime() - right.getTime());
  return {
    start: dates[0],
    end: dates[dates.length - 1]
  };
}

/**
 * 將日期加上指定天數並轉回 YYYY-MM-DD。
 */
export function addDays(date: Date, days: number): string {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next.toISOString().slice(0, 10);
}

/**
 * 將兩個日期差轉成欄位偏移。
 */
export function daysFrom(base: Date, value: string | null): number {
  const parsed = parseDate(value);

  if (!parsed) {
    return 0;
  }

  return Math.floor((parsed.getTime() - base.getTime()) / 86400000);
}
