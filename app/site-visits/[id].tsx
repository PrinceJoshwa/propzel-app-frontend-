import React, { useMemo, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Icon from "@react-native-vector-icons/material-design-icons";

import { siteVisitsApi } from "@/src/api/crm";
import { leadIndex, qk, useLeads, useSiteVisits } from "@/src/api/queries";
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
import { formatDateTime } from "@/src/lib/format";
import { VISIT_STATUS_OPTIONS, visitStatusMeta } from "@/src/lib/visit-status";
import { makeStyles, radius, spacing, useTheme } from "@/src/theme";

export default function SiteVisitDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const visitId = String(id);
  const insets = useSafeAreaInsets();
  const styles = useStyles();
  const { colors } = useTheme();
  const toast = useToast();
  const qc = useQueryClient();

  const visitsQ = useSiteVisits();
  const leadsQ = useLeads();
  const byLead = useMemo(() => leadIndex(leadsQ.data ?? []), [leadsQ.data]);
  const visit = (visitsQ.data ?? []).find((v) => String(v.id) === visitId);

  const [noteOpen, setNoteOpen] = useState(false);
  const [scheduleOpen, setScheduleOpen] = useState(false);

  const invalidate = () => qc.invalidateQueries({ queryKey: qk.siteVisits });

  const statusMut = useMutation({
    mutationFn: (status: string) => siteVisitsApi.setStatus(visitId, status),
    onSuccess: (_d, status) => {
      invalidate();
      toast.show(`Marked ${visitStatusMeta(status).label.toLowerCase()}`);
    },
    onError: () => toast.show("Couldn't update status", "error"),
  });

  const rescheduleMut = useMutation({
    mutationFn: (iso: string) => siteVisitsApi.update(visitId, { scheduled_at: iso }),
    onSuccess: () => {
      invalidate();
      setScheduleOpen(false);
      toast.show("Site visit rescheduled");
    },
    onError: () => toast.show("Couldn't reschedule", "error"),
  });

  const noteMut = useMutation({
    mutationFn: (text: string) => {
      const stamp = new Date().toLocaleString();
      const existing = visit?.notes ? `${visit.notes}\n\n` : "";
      return siteVisitsApi.update(visitId, { notes: `${existing}[${stamp}] ${text}` });
    },
    onSuccess: () => {
      invalidate();
      setNoteOpen(false);
      toast.show("Note added");
    },
    onError: () => toast.show("Couldn't add note", "error"),
  });

  if (visitsQ.isLoading) {
    return (
      <View style={styles.screen}>
        <ScreenHeader title="Site visit" back />
        <LoadingScreen />
      </View>
    );
  }

  if (!visit) {
    return (
      <View style={styles.screen}>
        <ScreenHeader title="Site visit" back />
        <EmptyState
          icon="map-marker-off-outline"
          title="Visit not found"
          subtitle="This site visit couldn't be loaded."
        />
      </View>
    );
  }

  const lead = byLead[String(visit.lead_id)];
  const name = lead?.name || visit.contact_name || "Site visit";
  const phone = visit.contact_phone || lead?.phone;
  const meta = visitStatusMeta(visit.status);
  const noteLines = (visit.notes || "").split("\n").filter((l) => l.trim());

  return (
    <View style={styles.screen}>
      <ScreenHeader title={name} subtitle={meta.label} back testID="visit-detail-header" />
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.xxl }]}
        showsVerticalScrollIndicator={false}
      >
        <Card style={styles.contactCard}>
          <View style={styles.whenRow}>
            <Icon name="calendar-clock" size={20} color={colors.brandPrimary} />
            <Text style={styles.whenText}>{formatDateTime(visit.scheduled_at)}</Text>
            <Badge label={meta.label} tone={meta.tone} />
          </View>
          <Text style={styles.leadName}>{name}</Text>
          <ContactActions leadId={visit.lead_id ? String(visit.lead_id) : undefined} phone={phone} labels message={`Hi ${name}`} />
        </Card>

        <SectionTitle>Update status</SectionTitle>
        <View style={styles.statusRow}>
          {VISIT_STATUS_OPTIONS.map((opt) => {
            const active = visitStatusMeta(visit.status).key === opt.key;
            return (
              <Pressable
                key={opt.key}
                testID={`visit-status-${opt.key}`}
                disabled={statusMut.isPending}
                onPress={() => statusMut.mutate(opt.key)}
                style={[
                  styles.statusChip,
                  active && { backgroundColor: opt.tone + "1A", borderColor: opt.tone },
                ]}
              >
                <Text
                  style={[
                    styles.statusChipText,
                    active && { color: opt.tone },
                  ]}
                >
                  {opt.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.actionsRow}>
          <Button
            testID="visit-reschedule-button"
            label="Reschedule"
            icon="calendar-edit"
            variant="secondary"
            onPress={() => setScheduleOpen(true)}
            style={{ flex: 1 }}
          />
          <Button
            testID="visit-add-note-button"
            label="Add note"
            icon="note-plus-outline"
            onPress={() => setNoteOpen(true)}
            style={{ flex: 1 }}
          />
        </View>

        <SectionTitle>Notes</SectionTitle>
        {noteLines.length === 0 ? (
          <Card style={{ alignItems: "center", paddingVertical: spacing.xl }}>
            <Icon name="note-outline" size={26} color={colors.muted} />
            <Text style={styles.noteEmpty}>No notes yet</Text>
          </Card>
        ) : (
          <Card style={{ gap: spacing.md }}>
            {noteLines.map((line, i) => (
              <View key={i} style={styles.noteLine}>
                <Icon name="circle-medium" size={18} color={colors.brandPrimary} />
                <Text style={styles.noteText}>{line}</Text>
              </View>
            ))}
          </Card>
        )}
      </ScrollView>

      <ScheduleSheet
        visible={scheduleOpen}
        onClose={() => setScheduleOpen(false)}
        onConfirm={(iso) => rescheduleMut.mutate(iso)}
        submitting={rescheduleMut.isPending}
        title="Reschedule site visit"
        confirmLabel="Reschedule"
      />
      <NoteSheet
        visible={noteOpen}
        onClose={() => setNoteOpen(false)}
        onSubmit={(t) => noteMut.mutate(t)}
        submitting={noteMut.isPending}
        title="Add visit note"
      />
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  screen: { flex: 1, backgroundColor: colors.surfaceSecondary },
  content: { padding: spacing.lg, gap: spacing.md },
  contactCard: { gap: spacing.lg },
  whenRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm, flexWrap: "wrap" },
  whenText: { fontSize: 15, fontWeight: "700", color: colors.onSurface, flex: 1 },
  leadName: { fontSize: 20, fontWeight: "800", color: colors.onSurface },
  statusRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  statusChip: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statusChipText: { fontSize: 13, fontWeight: "700", color: colors.onSurfaceTertiary },
  actionsRow: { flexDirection: "row", gap: spacing.sm },
  noteEmpty: { color: colors.muted, marginTop: spacing.sm },
  noteLine: { flexDirection: "row", gap: spacing.xs, alignItems: "flex-start" },
  noteText: { flex: 1, fontSize: 14, color: colors.onSurface, lineHeight: 20 },
}));
