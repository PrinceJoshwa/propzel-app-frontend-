// Typed endpoint wrappers for the CRM backend. Types are intentionally loose
// (extra fields tolerated) because the live API shapes are consumed as-is.

import { api } from "./client";

export type User = {
  id: string;
  name?: string;
  email: string;
  role?: string;
  phone?: string;
  [k: string]: any;
};

export type Lead = {
  id: string;
  name?: string;
  phone?: string;
  email?: string;
  stage?: string;
  source?: string;
  assigned_to?: string;
  project_id?: string;
  budget?: number | string;
  notes?: string;
  created_at?: string;
  updated_at?: string;
  last_activity_at?: string;
  [k: string]: any;
};

export type Activity = {
  id: string;
  lead_id?: string;
  kind?: string;
  type?: string;
  text?: string;
  content?: string;
  body?: string;
  note?: string;
  actor_name?: string;
  created_at?: string;
  [k: string]: any;
};

export type FollowUp = {
  id: string;
  lead_id?: string;
  due_at?: string;
  kind?: string;
  status?: string;
  notes?: string;
  created_at?: string;
  [k: string]: any;
};

export type SiteVisit = {
  id: string;
  lead_id?: string;
  project_id?: string;
  scheduled_at?: string;
  status?: string;
  notes?: string;
  contact_name?: string;
  contact_phone?: string;
  presales_owner_id?: string;
  sales_owner_id?: string;
  created_at?: string;
  [k: string]: any;
};

export type Project = { id: string; name?: string; [k: string]: any };

// --- Auth ---
export const authApi = {
  login: (email: string, password: string) =>
    api<User>("/auth/login", { method: "POST", body: { email, password } }),
  me: () => api<User>("/auth/me"),
  logout: () => api("/auth/logout", { method: "POST" }),
};

// --- Leads ---
export const leadsApi = {
  list: () => api<Lead[]>("/leads"),
  get: (id: string) => api<Lead>(`/leads/${id}`),
  activities: (id: string) =>
    api<Activity[]>("/activities", { params: { lead_id: id, limit: 100 } }),
  addNote: (id: string, text: string, kind = "note") =>
    api(`/leads/${id}/notes`, { method: "POST", body: { text, kind } }),
};

// --- Follow-ups ---
export const followUpsApi = {
  list: (params?: { status?: string; date_from?: string; date_to?: string }) =>
    api<FollowUp[]>("/follow-ups", { params }),
  create: (lead_id: string, due_at: string, kind = "call") =>
    api("/follow-ups", { method: "POST", body: { lead_id, due_at, kind } }),
  markDone: (id: string) =>
    api(`/follow-ups/${id}`, { method: "PATCH", body: { status: "done" } }),
  reschedule: (id: string, due_at: string) =>
    api(`/follow-ups/${id}`, { method: "PATCH", body: { due_at } }),
  update: (id: string, body: Record<string, any>) =>
    api(`/follow-ups/${id}`, { method: "PATCH", body }),
};

// --- Site visits ---
export const siteVisitsApi = {
  list: (params?: { project_id?: string }) =>
    api<SiteVisit[]>("/site-visits", { params }),
  get: (id: string) => api<SiteVisit>(`/site-visits/${id}`),
  create: (body: Record<string, any>) =>
    api("/site-visits", { method: "POST", body }),
  update: (id: string, body: Record<string, any>) =>
    api(`/site-visits/${id}`, { method: "PATCH", body }),
  setStatus: (id: string, status: string) =>
    api(`/site-visits/${id}`, { method: "PATCH", body: { status } }),
};

// --- Projects ---
export const projectsApi = {
  list: () => api<Project[]>("/projects"),
};

// --- Calling (CallerDesk click-to-call) ---
export const callingApi = {
  // Triggers a CallerDesk click-to-call for the lead. The backend dials the
  // agent and connects the lead; returns { status, call_sid, raw, ... }.
  clickToCall: (leadId: string) => api(`/leads/${leadId}/call`, { method: "POST" }),
  status: () => api("/calling/status"),
};

// --- Dashboard (role-scoped by the backend) ---
export const dashboardApi = {
  monthly: () => api("/dashboard/monthly"),
  actionItems: () => api("/dashboard/action-items"),
  callReport: () => api("/callerdesk/dashboard"), // admin + manager only
  eod: () => api("/admin/eod-summary"), // admin only
};
