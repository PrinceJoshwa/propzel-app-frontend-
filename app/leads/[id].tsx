import React, { useState } from "react";
import {
  RefreshControl,
  ScrollView,
  Text,
  View,
} from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Icon from "@react-native-vector-icons/material-design-icons";

import { Activity } from "@/src/api/crm";
import { followUpsApi, leadsApi } from "@/src/api/crm";
import { qk, useLead, useLeadActivities } from "@/src/api/queries";
import { ContactActions } from "@/src/components/contact-actions";
import { ScreenHeader } from "@/src/components/header";
import { NoteSheet } from "@/src/components/note-sheet";
import { ScheduleSheet } from "@/src/components/schedule-sheet";
import { useToast } from "@/src/components/toast";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  LoadingScreen,
  SectionTitle,
} from "@/src/components/ui";
import { formatDate, formatDateTime } from "@/src/lib/format";
import { stageMeta } from "@/src/lib/stages";
import { makeStyles, radius, spacing, useTheme } from "@/src/theme";

function activityText(a: Activity): string {
  return a.text || a.content || a.body || a.note || a.message || "—";
}
function activityIcon(a: Activity): string {
  const k = String(a.kind || a.type || "").toLowerCase();
  if (k.includes("note")) return "note-text-outline";
  if (k.includes("call")) return "phone";
  if (k.includes("whatsapp") || k.includes("wa")) return "whatsapp";
  if (k.includes("visit")) return "map-marker-radius";
  if (k.includes("follow")) return "phone-clock";
  if (k.includes("stage") || k.includes("status")) return "swap-horizontal";
  if (k.includes("email")) return "email-outline";
  return "circle-medium";
}

export default function LeadDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const leadId = String(id);
  const insets = useSafeAreaInsets();
  const styles = useStyles();
  const { colors } = useTheme();
  const toast = useToast();
  const qc = useQueryClient();

  const leadQ = useLead(leadId);
  const actQ = useLeadActivities(leadId);
  const lead = leadQ.data;

  const [noteOpen, setNoteOpen] = useState(false);
  const [scheduleOpen, setScheduleOpen] = useState(false);

  const noteMut = useMutation({
    mutationFn: (text: string) => leadsApi.addNote(leadId, text),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.activities(leadId) });
      qc.invalidateQueries({ queryKey: qk.lead(leadId) });
      qc.invalidateQueries({ queryKey: qk.leads });
      setNoteOpen(false);
      toast.show("Note added");
    },
    onError: () => toast.show("Couldn't add note", "error"),
  });

  const followMut = useMutation({
    mutationFn: (iso: string) => followUpsApi.create(leadId, iso),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.followUps });
      qc.invalidateQueries({ queryKey: qk.activities(leadId) });
      setScheduleOpen(false);
      toast.show("Follow-up scheduled");
    },
    onError: () => toast.show("Couldn't schedule follow-up", "error"),
  });

  if (leadQ.isLoading) {
    return (
      <View style={styles.screen}>
        <ScreenHeader title="Lead" back />
        <LoadingScreen />
      </View>
    );
  }

  if (!lead) {
    return (
      <View style={styles.screen}>
        <ScreenHeader title="Lead" back />
        <EmptyState
          icon="account-alert-outline"
          title="Lead not available"
          subtitle="This lead couldn't be loaded."
        />
      </View>
    );
  }

  const st = stageMeta(lead.stage);
  const activities = actQ.data ?? [];

  const budgetStr = (() => {
    const min = lead.budget_min ? Number(lead.budget_min) : undefined;
    const max = lead.budget_max ? Number(lead.budget_max) : undefined;
    const fmt = (n: number) => `₹${(n / 100000).toFixed(0)}L`;
    if (min && max) return `${fmt(min)} – ${fmt(max)}`;
    if (min) return `${fmt(min)}+`;
    if (max) return `up to ${fmt(max)}`;
    return undefined;
  })();

  const details = [
    { icon: "phone", label: "Phone", value: lead.phone },
    { icon: "email-outline", label: "Email", value: lead.email },
    { icon: "target", label: "Source", value: lead.source },
    { icon: "home-city-outline", label: "Config", value: lead.configuration },
    { icon: "cash", label: "Budget", value: budgetStr },
    { icon: "calendar-plus", label: "Created", value: lead.created_at ? formatDate(lead.created_at) : undefined },
  ].filter((d) => d.value);

  return (
    <View style={styles.screen}>
      <ScreenHeader title={lead.name || "Lead"} subtitle={st.label} back testID="lead-detail-header" />
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.xxl }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={leadQ.isRefetching || actQ.isRefetching}
            onRefresh={() => {
              leadQ.refetch();
              actQ.refetch();
            }}
            tintColor={colors.brandPrimary}
          />
        }
      >
        {/* Contact card */}
        <Card style={styles.contactCard} testID="lead-contact-card">
          <View style={styles.contactTop}>
            <View style={{ flex: 1 }}>
              <Text style={styles.leadName}>{lead.name || "Unnamed lead"}</Text>
              <Badge label={st.label} tone={st.tone} style={{ marginTop: spacing.sm }} />
            </View>
          </View>
          <ContactActions leadId={String(lead.id)} phone={lead.phone} labels message={`Hi ${lead.name || ""}`} />
        </Card>

        {/* Quick actions */}
        <View style={styles.actionsRow}>
          <Button
            testID="lead-add-note-button"
            label="Add note"
            icon="note-plus-outline"
            variant="secondary"
            onPress={() => setNoteOpen(true)}
            style={{ flex: 1 }}
          />
          <Button
            testID="lead-schedule-button"
            label="Follow-up"
            icon="calendar-clock"
            onPress={() => setScheduleOpen(true)}
            style={{ flex: 1 }}
          />
        </View>

        {/* Details */}
        {details.length > 0 && (
          <>
            <SectionTitle>Details</SectionTitle>
            <Card style={{ padding: 0 }}>
              {details.map((d, i) => (
                <View
                  key={d.label}
                  style={[styles.detailRow, i < details.length - 1 && styles.detailDivider]}
                >
                  <Icon name={d.icon as any} size={18} color={colors.muted} />
                  <Text style={styles.detailLabel}>{d.label}</Text>
                  <Text style={styles.detailValue} numberOfLines={1}>
                    {d.value}
                  </Text>
                </View>
              ))}
            </Card>
          </>
        )}

        {/* History */}
        <SectionTitle>Notes & history</SectionTitle>
        {actQ.isLoading ? (
          <Card><Text style={styles.detailLabel}>Loading history…</Text></Card>
        ) : activities.length === 0 ? (
          <Card style={{ alignItems: "center", paddingVertical: spacing.xl }}>
            <Icon name="history" size={28} color={colors.muted} />
            <Text style={[styles.detailLabel, { marginTop: spacing.sm }]}>
              No activity yet. Add a note to start the history.
            </Text>
          </Card>
        ) : (
          <View style={styles.timeline}>
            {activities.map((a, i) => (
              <View key={a.id || i} style={styles.timelineItem}>
                <View style={styles.timelineIconWrap}>
                  <View style={styles.timelineIcon}>
                    <Icon name={activityIcon(a) as any} size={16} color={colors.brandPrimary} />
                  </View>
                  {i < activities.length - 1 && <View style={styles.timelineLine} />}
                </View>
                <View style={styles.timelineBody}>
                  <Text style={styles.timelineText}>{activityText(a)}</Text>
                  <Text style={styles.timelineMeta}>
                    {a.actor_name ? `${a.actor_name} · ` : ""}
                    {formatDateTime(a.created_at)}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      <NoteSheet
        visible={noteOpen}
        onClose={() => setNoteOpen(false)}
        onSubmit={(t) => noteMut.mutate(t)}
        submitting={noteMut.isPending}
        title="Add note to lead"
      />
      <ScheduleSheet
        visible={scheduleOpen}
        onClose={() => setScheduleOpen(false)}
        onConfirm={(iso) => followMut.mutate(iso)}
        submitting={followMut.isPending}
        title="Schedule follow-up"
        confirmLabel="Schedule follow-up"
      />
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  screen: { flex: 1, backgroundColor: colors.surfaceSecondary },
  content: { padding: spacing.lg, gap: spacing.md },
  contactCard: { gap: spacing.lg },
  contactTop: { flexDirection: "row", alignItems: "center" },
  leadName: { fontSize: 20, fontWeight: "800", color: colors.onSurface },
  actionsRow: { flexDirection: "row", gap: spacing.sm },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  detailDivider: { borderBottomWidth: 1, borderBottomColor: colors.divider },
  detailLabel: { fontSize: 14, color: colors.muted, width: 70 },
  detailValue: { flex: 1, fontSize: 14, fontWeight: "600", color: colors.onSurface, textAlign: "right" },
  timeline: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
  },
  timelineItem: { flexDirection: "row", gap: spacing.md },
  timelineIconWrap: { alignItems: "center", width: 32 },
  timelineIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.brandTertiary,
    alignItems: "center",
    justifyContent: "center",
  },
  timelineLine: { flex: 1, width: 2, backgroundColor: colors.divider, marginVertical: 4 },
  timelineBody: { flex: 1, paddingBottom: spacing.lg },
  timelineText: { fontSize: 14, color: colors.onSurface, lineHeight: 20 },
  timelineMeta: { fontSize: 12, color: colors.muted, marginTop: 4 },
}));
