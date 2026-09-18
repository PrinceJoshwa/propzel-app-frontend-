import React, { useMemo } from "react";
import {
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Icon from "@react-native-vector-icons/material-design-icons";

import { useAuth } from "@/src/auth/auth-context";
import {
  leadIndex,
  useActionItems,
  useCallReport,
  useDashboardMonthly,
  useEod,
  useLeads,
} from "@/src/api/queries";
import { ContactActions } from "@/src/components/contact-actions";
import { Avatar, Card, LoadingScreen, SectionTitle } from "@/src/components/ui";
import { formatTime, relativeTime } from "@/src/lib/format";
import { usesNativeTabs } from "@/src/navigation";
import { makeStyles, radius, spacing, useTheme } from "@/src/theme";

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function money(n?: number): string {
  const v = Number(n || 0);
  if (v >= 1e7) return `₹${(v / 1e7).toFixed(2)} Cr`;
  if (v >= 1e5) return `₹${(v / 1e5).toFixed(1)} L`;
  return `₹${v.toLocaleString("en-IN")}`;
}

export default function Dashboard() {
  const insets = useSafeAreaInsets();
  const styles = useStyles();
  const { colors } = useTheme();
  const router = useRouter();
  const { user } = useAuth();

  const role = String(user?.role || "").toLowerCase();
  const isAdmin = role === "admin";
  const isManager = role === "manager";
  const canCallReport = isAdmin || isManager;

  const monthlyQ = useDashboardMonthly();
  const actionQ = useActionItems();
  const callQ = useCallReport(canCallReport);
  const eodQ = useEod(isAdmin);
  const leadsQ = useLeads();
  const byLead = useMemo(() => leadIndex(leadsQ.data ?? []), [leadsQ.data]);

  const monthly: any = monthlyQ.data ?? {};
  const action: any = actionQ.data ?? {};
  const widgets = action.widgets ?? {};
  const kpi = monthly.kpi ?? {};
  const rev = monthly.revenue ?? {};
  const call: any = callQ.data ?? {};
  const eod: any = eodQ.data ?? {};

  const loading = monthlyQ.isLoading && actionQ.isLoading;
  const refreshing =
    monthlyQ.isRefetching ||
    actionQ.isRefetching ||
    callQ.isRefetching ||
    eodQ.isRefetching;
  const onRefresh = () => {
    monthlyQ.refetch();
    actionQ.refetch();
    if (canCallReport) callQ.refetch();
    if (isAdmin) eodQ.refetch();
    leadsQ.refetch();
  };

  const bottomChrome = usesNativeTabs ? insets.bottom : 0;

  const stats = [
    { key: "tf", label: "Today's follow-ups", value: widgets.todays_followups ?? 0, icon: "phone-clock", tone: colors.brandPrimary, to: "/(tabs)/follow-ups" },
    { key: "sc", label: "Scheduled calls", value: widgets.scheduled_calls ?? 0, icon: "phone-outgoing", tone: colors.info, to: "/(tabs)/follow-ups" },
    { key: "mc", label: "Missed calls", value: widgets.missed_calls ?? 0, icon: "phone-missed", tone: colors.error, to: null },
    { key: "dnp", label: "Did not pick", value: widgets.dnp_calls ?? 0, icon: "phone-cancel", tone: colors.warning, to: null },
    { key: "tasks", label: "Open tasks", value: widgets.tasks ?? 0, icon: "clipboard-check-outline", tone: colors.accent, to: null },
    { key: "nl", label: "New leads (mo)", value: kpi.new_leads ?? 0, icon: "account-plus", tone: colors.success, to: "/(tabs)/leads" },
  ];

  const todays = (action.todays_followups ?? []) as any[];
  const planned = (action.planned_visits ?? []) as any[];
  const noCall = (action.no_call_leads ?? []) as any[];
  const noFollow = (action.no_followup_leads ?? []) as any[];

  const roleLabel = role ? role.toUpperCase() : "";

  return (
    <View style={styles.screen}>
      <View style={[styles.hero, { paddingTop: insets.top + spacing.md }]}>
        <View style={styles.heroRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.heroGreeting}>{greeting()},</Text>
            <Text style={styles.heroName} numberOfLines={1}>
              {user?.name || user?.email || "there"}
            </Text>
            {roleLabel ? (
              <View style={styles.rolePill}>
                <Icon name="shield-account" size={12} color={colors.onBrandPrimary} />
                <Text style={styles.roleText}>{roleLabel}</Text>
              </View>
            ) : null}
          </View>
          <Pressable testID="dashboard-profile-button" onPress={() => router.push("/profile")}>
            <Avatar name={user?.name || user?.email} size={46} />
          </Pressable>
        </View>
      </View>

      {loading ? (
        <LoadingScreen />
      ) : (
        <ScrollView
          testID="dashboard-scroll"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.content, { paddingBottom: bottomChrome + spacing.xxl }]}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.brandPrimary} />
          }
        >
          {/* KPI widgets (all roles) */}
          <View style={styles.statsGrid}>
            {stats.map((s) => (
              <Card
                key={s.key}
                testID={`stat-${s.key}`}
                style={styles.statCard}
                onPress={s.to ? () => router.push(s.to as any) : undefined}
              >
                <View style={[styles.statIcon, { backgroundColor: s.tone + "1A" }]}>
                  <Icon name={s.icon as any} size={18} color={s.tone} />
                </View>
                <Text style={styles.statValue}>{s.value}</Text>
                <Text style={styles.statLabel} numberOfLines={1}>{s.label}</Text>
              </Card>
            ))}
          </View>

          {/* Business snapshot — admin only */}
          {isAdmin && (
            <>
              <SectionTitle>Business snapshot</SectionTitle>
              <Card testID="dash-revenue-card" style={styles.revCard}>
                <View style={styles.revTop}>
                  <View>
                    <Text style={styles.revLabel}>Revenue this month</Text>
                    <Text style={styles.revValue}>{money(rev.current)}</Text>
                  </View>
                  <View
                    style={[
                      styles.changePill,
                      { backgroundColor: (Number(rev.change_pct) >= 0 ? colors.success : colors.error) + "1A" },
                    ]}
                  >
                    <Icon
                      name={Number(rev.change_pct) >= 0 ? "trending-up" : "trending-down"}
                      size={14}
                      color={Number(rev.change_pct) >= 0 ? colors.success : colors.error}
                    />
                    <Text
                      style={{
                        color: Number(rev.change_pct) >= 0 ? colors.success : colors.error,
                        fontWeight: "800",
                        fontSize: 12,
                      }}
                    >
                      {Math.abs(Number(rev.change_pct) || 0).toFixed(0)}%
                    </Text>
                  </View>
                </View>
                <View style={styles.revStatsRow}>
                  <RevStat label="Bookings" value={String(kpi.booked ?? 0)} />
                  <RevStat label="Conversion" value={`${(Number(kpi.conversion) || 0).toFixed(0)}%`} />
                  <RevStat label="Prev month" value={money(rev.previous)} />
                </View>
              </Card>
            </>
          )}

          {/* Call report — admin + manager */}
          {canCallReport && callQ.isSuccess && (
            <>
              <SectionTitle>Call report</SectionTitle>
              <Card testID="dash-call-report" style={{ gap: spacing.md }}>
                <View style={styles.reportGrid}>
                  <ReportStat label="Total calls" value={call.total_calls ?? 0} tone={colors.brandPrimary} icon="phone" />
                  <ReportStat label="Connected" value={call.connected ?? 0} tone={colors.success} icon="phone-check" />
                  <ReportStat label="Failed" value={call.failed ?? 0} tone={colors.error} icon="phone-missed" />
                  <ReportStat label="DNP" value={call.dnp ?? 0} tone={colors.warning} icon="phone-cancel" />
                </View>
                <View style={styles.campaignRow}>
                  <Icon name="bullhorn-outline" size={16} color={colors.muted} />
                  <Text style={styles.campaignText}>
                    {call.active_campaigns ?? 0} active campaigns · {call.pending_campaign_calls ?? 0} pending calls
                  </Text>
                </View>
              </Card>
            </>
          )}

          {/* End of day — admin only */}
          {isAdmin && eodQ.isSuccess && (
            <>
              <SectionTitle>End of day summary</SectionTitle>
              <Card testID="dash-eod" style={{ gap: spacing.md }}>
                <View style={styles.reportGrid}>
                  <ReportStat label="Due today" value={eod.followups?.due_today ?? 0} tone={colors.info} icon="calendar-today" />
                  <ReportStat label="Overdue" value={eod.followups?.overdue ?? 0} tone={colors.error} icon="calendar-alert" />
                  <ReportStat label="Bookings" value={eod.milestones?.bookings ?? 0} tone={colors.success} icon="star-check" />
                  <ReportStat label="Calls" value={eod.calls?.total ?? 0} tone={colors.brandPrimary} icon="phone" />
                </View>
                {(eod.top_execs ?? []).length > 0 && (
                  <View style={{ gap: spacing.sm }}>
                    <Text style={styles.subheading}>Top executives today</Text>
                    {(eod.top_execs as any[]).slice(0, 3).map((ex, i) => (
                      <View key={i} style={styles.execRow}>
                        <Avatar name={ex.name} size={30} />
                        <Text style={styles.execName} numberOfLines={1}>{ex.name}</Text>
                        <Text style={styles.execCalls}>{ex.calls} calls</Text>
                      </View>
                    ))}
                  </View>
                )}
              </Card>
            </>
          )}

          {/* Action items (all roles) */}
          <SectionTitle
            right={
              <Pressable onPress={() => router.push("/(tabs)/follow-ups")}>
                <Text style={styles.link}>Follow-ups</Text>
              </Pressable>
            }
          >
            Action items
          </SectionTitle>

          <ActionGroup
            title="Today's follow-ups"
            icon="phone-clock"
            empty="No follow-ups scheduled today"
            items={todays.map((f) => ({
              id: f.id,
              title: byLead[String(f.lead_id)]?.name || "Follow-up",
              sub: `${formatTime(f.due_at)}${f.kind ? ` · ${String(f.kind).toUpperCase()}` : ""}`,
              leadId: f.lead_id,
              phone: byLead[String(f.lead_id)]?.phone,
              onPress: () => router.push("/(tabs)/follow-ups"),
            }))}
          />

          <ActionGroup
            title="Planned site visits"
            icon="map-marker-radius"
            empty="No upcoming site visits"
            items={planned.map((v) => ({
              id: v.id,
              title: byLead[String(v.lead_id)]?.name || "Site visit",
              sub: formatTime(v.scheduled_at),
              leadId: v.lead_id,
              phone: byLead[String(v.lead_id)]?.phone,
              onPress: () => router.push(`/site-visits/${v.id}`),
            }))}
          />

          <ActionGroup
            title="Leads to call"
            icon="phone-plus"
            empty="Everyone has been contacted"
            items={noCall.slice(0, 6).map((l) => ({
              id: l.id,
              title: l.name || "Lead",
              sub: l.phone || l.phone_masked || "No phone",
              leadId: l.id,
              phone: l.phone,
              onPress: () => router.push(`/leads/${l.id}`),
            }))}
          />

          <ActionGroup
            title="Leads without a follow-up"
            icon="account-clock"
            empty="Every lead has a next step"
            items={noFollow.slice(0, 6).map((l) => ({
              id: l.id,
              title: l.name || "Lead",
              sub: relativeTime(l.updated_at || l.created_at),
              leadId: l.id,
              phone: l.phone,
              onPress: () => router.push(`/leads/${l.id}`),
            }))}
          />
        </ScrollView>
      )}
    </View>
  );
}

function RevStat({ label, value }: { label: string; value: string }) {
  const styles = useStyles();
  return (
    <View style={styles.revStat}>
      <Text style={styles.revStatValue}>{value}</Text>
      <Text style={styles.revStatLabel}>{label}</Text>
    </View>
  );
}

function ReportStat({ label, value, tone, icon }: { label: string; value: number | string; tone: string; icon: string }) {
  const styles = useStyles();
  return (
    <View style={styles.reportStat}>
      <View style={[styles.reportIcon, { backgroundColor: tone + "1A" }]}>
        <Icon name={icon as any} size={16} color={tone} />
      </View>
      <Text style={styles.reportValue}>{value}</Text>
      <Text style={styles.reportLabel} numberOfLines={1}>{label}</Text>
    </View>
  );
}

function ActionGroup({
  title,
  icon,
  empty,
  items,
}: {
  title: string;
  icon: string;
  empty: string;
  items: { id: string; title: string; sub: string; leadId?: string; phone?: string; onPress: () => void }[];
}) {
  const styles = useStyles();
  const { colors } = useTheme();
  return (
    <View style={{ marginBottom: spacing.md }}>
      <View style={styles.groupHeader}>
        <Icon name={icon as any} size={16} color={colors.brandPrimary} />
        <Text style={styles.groupTitle}>{title}</Text>
        <View style={styles.countPill}>
          <Text style={styles.countText}>{items.length}</Text>
        </View>
      </View>
      {items.length === 0 ? (
        <Text style={styles.groupEmpty}>{empty}</Text>
      ) : (
        <View style={{ gap: spacing.sm }}>
          {items.map((it) => (
            <Card key={it.id} testID={`action-${it.id}`} onPress={it.onPress} style={styles.actionRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.actionTitle} numberOfLines={1}>{it.title}</Text>
                <Text style={styles.actionSub} numberOfLines={1}>{it.sub}</Text>
              </View>
              <ContactActions leadId={it.leadId ? String(it.leadId) : undefined} phone={it.phone} size="sm" message={`Hi ${it.title}`} />
            </Card>
          ))}
        </View>
      )}
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  screen: { flex: 1, backgroundColor: colors.surfaceSecondary },
  hero: {
    backgroundColor: colors.brandPrimary,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
    borderBottomLeftRadius: radius.xl,
    borderBottomRightRadius: radius.xl,
  },
  heroRow: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  heroGreeting: { color: colors.onBrandPrimary, opacity: 0.85, fontSize: 14 },
  heroName: { color: colors.onBrandPrimary, fontSize: 24, fontWeight: "800" },
  rolePill: {
    alignSelf: "flex-start",
    marginTop: spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(255,255,255,0.16)",
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: radius.pill,
  },
  roleText: { color: colors.onBrandPrimary, fontSize: 11, fontWeight: "800", letterSpacing: 0.5 },
  content: { padding: spacing.lg, gap: spacing.md },

  statsGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  statCard: { width: "31.5%", flexGrow: 1, padding: spacing.md, gap: 2 },
  statIcon: { width: 34, height: 34, borderRadius: 10, alignItems: "center", justifyContent: "center", marginBottom: spacing.xs },
  statValue: { fontSize: 22, fontWeight: "800", color: colors.onSurface },
  statLabel: { fontSize: 11, color: colors.muted, fontWeight: "600" },

  revCard: { gap: spacing.lg, backgroundColor: colors.brandPrimary },
  revTop: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between" },
  revLabel: { color: colors.onBrandPrimary, opacity: 0.8, fontSize: 13, fontWeight: "600" },
  revValue: { color: colors.onBrandPrimary, fontSize: 28, fontWeight: "800", marginTop: 2 },
  changePill: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: radius.pill, backgroundColor: "rgba(255,255,255,0.16)" },
  revStatsRow: { flexDirection: "row", gap: spacing.sm },
  revStat: { flex: 1, backgroundColor: "rgba(255,255,255,0.10)", borderRadius: radius.md, padding: spacing.md, gap: 2 },
  revStatValue: { color: colors.onBrandPrimary, fontSize: 16, fontWeight: "800" },
  revStatLabel: { color: colors.onBrandPrimary, opacity: 0.8, fontSize: 11, fontWeight: "600" },

  reportGrid: { flexDirection: "row", gap: spacing.sm },
  reportStat: { flex: 1, alignItems: "center", gap: 2 },
  reportIcon: { width: 34, height: 34, borderRadius: 10, alignItems: "center", justifyContent: "center", marginBottom: 2 },
  reportValue: { fontSize: 18, fontWeight: "800", color: colors.onSurface },
  reportLabel: { fontSize: 10, color: colors.muted, fontWeight: "600" },
  campaignRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm, borderTopWidth: 1, borderTopColor: colors.divider, paddingTop: spacing.md },
  campaignText: { fontSize: 12, color: colors.muted, fontWeight: "600" },

  subheading: { fontSize: 12, fontWeight: "800", color: colors.muted, textTransform: "uppercase", letterSpacing: 0.5 },
  execRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  execName: { flex: 1, fontSize: 14, fontWeight: "700", color: colors.onSurface },
  execCalls: { fontSize: 13, color: colors.brandPrimary, fontWeight: "700" },

  link: { color: colors.brandPrimary, fontWeight: "700", fontSize: 13 },
  groupHeader: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginBottom: spacing.sm },
  groupTitle: { fontSize: 15, fontWeight: "800", color: colors.onSurface },
  countPill: { backgroundColor: colors.brandTertiary, borderRadius: radius.pill, minWidth: 22, paddingHorizontal: 7, paddingVertical: 1, alignItems: "center" },
  countText: { color: colors.brandPrimary, fontWeight: "800", fontSize: 12 },
  groupEmpty: { fontSize: 13, color: colors.muted, paddingVertical: spacing.sm },
  actionRow: { flexDirection: "row", alignItems: "center", gap: spacing.md, paddingVertical: spacing.md },
  actionTitle: { fontSize: 15, fontWeight: "700", color: colors.onSurface },
  actionSub: { fontSize: 13, color: colors.muted, marginTop: 2 },
}));
