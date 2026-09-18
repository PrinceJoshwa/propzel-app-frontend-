import { useQuery } from "@tanstack/react-query";

import {
  Activity,
  FollowUp,
  Lead,
  SiteVisit,
  dashboardApi,
  followUpsApi,
  leadsApi,
  siteVisitsApi,
} from "./crm";

export const qk = {
  leads: ["leads"] as const,
  lead: (id: string) => ["lead", id] as const,
  activities: (id: string) => ["activities", id] as const,
  followUps: ["follow-ups"] as const,
  siteVisits: ["site-visits"] as const,
  dashMonthly: ["dash-monthly"] as const,
  actionItems: ["action-items"] as const,
  callReport: ["call-report"] as const,
  eod: ["eod-summary"] as const,
};

const toArray = <T,>(d: any): T[] =>
  Array.isArray(d) ? d : Array.isArray(d?.items) ? d.items : Array.isArray(d?.data) ? d.data : [];

export function useLeads() {
  return useQuery({
    queryKey: qk.leads,
    queryFn: async () => toArray<Lead>(await leadsApi.list()),
  });
}

export function useLead(id: string) {
  return useQuery({
    queryKey: qk.lead(id),
    queryFn: () => leadsApi.get(id),
    enabled: !!id,
  });
}

export function useLeadActivities(id: string) {
  return useQuery({
    queryKey: qk.activities(id),
    queryFn: async () => toArray<Activity>(await leadsApi.activities(id)),
    enabled: !!id,
  });
}

export function useFollowUps() {
  return useQuery({
    queryKey: qk.followUps,
    queryFn: async () => toArray<FollowUp>(await followUpsApi.list()),
  });
}

export function useSiteVisits() {
  return useQuery({
    queryKey: qk.siteVisits,
    queryFn: async () => toArray<SiteVisit>(await siteVisitsApi.list()),
  });
}

// Build a quick id -> lead lookup for joining follow-ups / site-visits.
export function leadIndex(leads: Lead[]): Record<string, Lead> {
  const map: Record<string, Lead> = {};
  leads.forEach((l) => {
    if (l.id) map[String(l.id)] = l;
  });
  return map;
}

// --- Dashboard ---
export function useDashboardMonthly() {
  return useQuery({
    queryKey: qk.dashMonthly,
    queryFn: () => dashboardApi.monthly(),
  });
}

export function useActionItems() {
  return useQuery({
    queryKey: qk.actionItems,
    queryFn: () => dashboardApi.actionItems(),
  });
}

export function useCallReport(enabled: boolean) {
  return useQuery({
    queryKey: qk.callReport,
    queryFn: () => dashboardApi.callReport(),
    enabled,
    retry: false,
  });
}

export function useEod(enabled: boolean) {
  return useQuery({
    queryKey: qk.eod,
    queryFn: () => dashboardApi.eod(),
    enabled,
    retry: false,
  });
}
