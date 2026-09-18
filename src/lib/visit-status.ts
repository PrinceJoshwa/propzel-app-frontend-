export type StatusMeta = { key: string; label: string; tone: string };

const VISIT: Record<string, StatusMeta> = {
  scheduled: { key: "scheduled", label: "Scheduled", tone: "#457B9D" },
  confirmed: { key: "confirmed", label: "Confirmed", tone: "#2D6A4F" },
  completed: { key: "completed", label: "Completed", tone: "#157347" },
  cancelled: { key: "cancelled", label: "Cancelled", tone: "#B03A2E" },
  no_show: { key: "no_show", label: "No show", tone: "#A16207" },
  missed: { key: "missed", label: "Missed", tone: "#A16207" },
};

export function visitStatusMeta(status?: string): StatusMeta {
  const k = String(status || "scheduled").toLowerCase();
  return (
    VISIT[k] || {
      key: k,
      label: k.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
      tone: "#6B7280",
    }
  );
}

export const VISIT_STATUS_OPTIONS: StatusMeta[] = [
  VISIT.scheduled,
  VISIT.completed,
  VISIT.cancelled,
  VISIT.no_show,
];

const FOLLOWUP: Record<string, StatusMeta> = {
  pending: { key: "pending", label: "Pending", tone: "#B45309" },
  scheduled: { key: "scheduled", label: "Scheduled", tone: "#457B9D" },
  done: { key: "done", label: "Done", tone: "#157347" },
  completed: { key: "completed", label: "Completed", tone: "#157347" },
  cancelled: { key: "cancelled", label: "Cancelled", tone: "#B03A2E" },
  missed: { key: "missed", label: "Missed", tone: "#B03A2E" },
};

export function followUpStatusMeta(status?: string): StatusMeta {
  const k = String(status || "pending").toLowerCase();
  return (
    FOLLOWUP[k] || {
      key: k,
      label: k.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
      tone: "#6B7280",
    }
  );
}

export function isFollowUpDone(status?: string): boolean {
  return ["done", "completed"].includes(String(status || "").toLowerCase());
}
