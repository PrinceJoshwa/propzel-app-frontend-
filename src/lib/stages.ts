// Lead stage metadata mirrored from the CRM web app.

export type StageMeta = { key: string; label: string; tone: string };

export const STAGES: StageMeta[] = [
  { key: "new", label: "New", tone: "#5C6661" },
  { key: "contacted", label: "Contacted", tone: "#457B9D" },
  { key: "contacted_dnp", label: "Contacted DNP", tone: "#6B7280" },
  { key: "qualified", label: "Qualified", tone: "#2D6A4F" },
  { key: "qualified_dnp", label: "Qualified DNP", tone: "#64748B" },
  { key: "site_visit", label: "Site Visit", tone: "#D4A373" },
  { key: "site_visit_dnp", label: "Site Visit DNP", tone: "#A16207" },
  { key: "negotiation", label: "Negotiation", tone: "#C25934" },
  { key: "negotiation_dnp", label: "Negotiation DNP", tone: "#9A3412" },
  { key: "booked", label: "Booked", tone: "#102A20" },
  { key: "lost", label: "Lost", tone: "#B03A2E" },
];

const BY_KEY: Record<string, StageMeta> = Object.fromEntries(
  STAGES.map((s) => [s.key, s]),
);

export function stageMeta(key?: string): StageMeta {
  if (!key) return { key: "unknown", label: "—", tone: "#6B7280" };
  return (
    BY_KEY[key] || {
      key,
      label: key
        .replace(/_/g, " ")
        .replace(/\b\w/g, (c) => c.toUpperCase()),
      tone: "#6B7280",
    }
  );
}
