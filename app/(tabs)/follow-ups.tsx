import React, { useMemo, useState } from "react";
import {
  Pressable,
  RefreshControl,
  ScrollView,
  SectionList,
  Text,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Icon from "@react-native-vector-icons/material-design-icons";

import { FollowUp } from "@/src/api/crm";
import { followUpsApi } from "@/src/api/crm";
import {
  leadIndex,
  qk,
  useFollowUps,
  useLeads,
} from "@/src/api/queries";
import { ContactActions } from "@/src/components/contact-actions";
import { ScreenHeader } from "@/src/components/header";
import { NoteSheet } from "@/src/components/note-sheet";
import { ScheduleSheet } from "@/src/components/schedule-sheet";
import { BottomSheet } from "@/src/components/sheet";
import { useToast } from "@/src/components/toast";
import { Badge, Button, EmptyState, LoadingScreen } from "@/src/components/ui";
import {
  dayKey,
  formatDateTime,
  formatDayHeading,
  formatTime,
  isPast,
} from "@/src/lib/format";
import { stageMeta } from "@/src/lib/stages";
import { followUpStatusMeta, isFollowUpDone } from "@/src/lib/visit-status";
import { usesNativeTabs } from "@/src/navigation";
import { makeStyles, radius, spacing, useTheme } from "@/src/theme";

const FILTERS = [
  { key: "pending", label: "Pending" },
  { key: "completed", label: "Completed" },
  { key: "all", label: "All" },
];

export default function FollowUpsScreen() {
  const insets = useSafeAreaInsets();
  const styles = useStyles();
  const { colors } = useTheme();
  const toast = useToast();
  const router = useRouter();
  const qc = useQueryClient();

  const followQ = useFollowUps();
  const leadsQ = useLeads();
  const byLead = useMemo(() => leadIndex(leadsQ.data ?? []), [leadsQ.data]);
  const followUps = followQ.data ?? [];

  const [filter, setFilter] = useState("pending");
  const [noteFor, setNoteFor] = useState<string | null>(null);
  const [rescheduleFor, setRescheduleFor] = useState<string | null>(null);
  const [previewFor, setPreviewFor] = useState<string | null>(null);

  const invalidate = () => qc.invalidateQueries({ queryKey: qk.followUps });

  const doneMut = useMutation({
    mutationFn: (id: string) => followUpsApi.markDone(id),
    onSuccess: () => {
      invalidate();
      setPreviewFor(null);
      toast.show("Follow-up completed");
    },
    onError: () => toast.show("Couldn't update follow-up", "error"),
  });

  const rescheduleMut = useMutation({
    mutationFn: ({ id, iso }: { id: string; iso: string }) =>
      followUpsApi.reschedule(id, iso),
    onSuccess: () => {
      invalidate();
      setRescheduleFor(null);
      toast.show("Follow-up rescheduled");
    },
    onError: () => toast.show("Couldn't reschedule", "error"),
  });

  const noteMut = useMutation({
    mutationFn: ({ id, text }: { id: string; text: string }) => {
      const fu = followUps.find((f) => String(f.id) === id);
      const stamp = new Date().toLocaleString();
      const existing = fu?.notes ? `${fu.notes}\n\n` : "";
      return followUpsApi.update(id, { notes: `${existing}[${stamp}] ${text}` });
    },
    onSuccess: () => {
      invalidate();
      setNoteFor(null);
      toast.show("Note added");
    },
    onError: () => toast.show("Couldn't add note", "error"),
  });

  const sections = useMemo(() => {
    let items = [...followUps];
    if (filter === "pending") items = items.filter((f) => !isFollowUpDone(f.status));
    else if (filter === "completed") items = items.filter((f) => isFollowUpDone(f.status));

    const groups: Record<string, FollowUp[]> = {};
    items.forEach((f) => {
      const k = dayKey(f.due_at);
      (groups[k] ||= []).push(f);
    });
    const keys = Object.keys(groups).sort((a, b) =>
      filter === "completed" ? b.localeCompare(a) : a.localeCompare(b),
    );
    return keys.map((k) => ({
      title: formatDayHeading(groups[k][0].due_at),
      key: k,
      data: groups[k].sort((a, b) => String(a.due_at).localeCompare(String(b.due_at))),
    }));
  }, [followUps, filter]);

  const bottomChrome = usesNativeTabs ? insets.bottom : 0;
  const preview = previewFor ? followUps.find((f) => String(f.id) === previewFor) : null;
  const previewLead = preview ? byLead[String(preview.lead_id)] : undefined;

  const renderItem = ({ item }: { item: FollowUp }) => {
    const lead = byLead[String(item.lead_id)];
    const name = lead?.name || "Follow-up";
    const phone = lead?.phone;
    const meta = followUpStatusMeta(item.status);
    const done = isFollowUpDone(item.status);
    const overdue = !done && isPast(item.due_at);

    return (
      <Pressable
        style={({ pressed }) => [styles.card, pressed && { opacity: 0.9 }]}
        testID={`follow-row-${item.id}`}
        onPress={() => setPreviewFor(String(item.id))}
      >
        <View style={styles.cardTop}>
          <View style={{ flex: 1 }}>
            <Text style={styles.name} numberOfLines={1}>{name}</Text>
            <View style={styles.timeRow}>
              <Icon name="clock-outline" size={14} color={overdue ? colors.error : colors.muted} />
              <Text style={[styles.time, overdue && { color: colors.error }]}>
                {formatTime(item.due_at)}
                {item.kind ? ` · ${item.kind}` : ""}
                {overdue ? " · overdue" : ""}
              </Text>
            </View>
          </View>
          <Badge label={meta.label} tone={meta.tone} />
        </View>

        {item.notes ? (
          <Text style={styles.notesPreview} numberOfLines={2}>
            {item.notes}
          </Text>
        ) : null}

        <View style={styles.cardActions}>
          <ContactActions
            leadId={item.lead_id ? String(item.lead_id) : undefined}
            phone={phone}
            size="sm"
            message={`Hi ${name}`}
          />
          <View style={{ flex: 1 }} />
          {!done && (
            <Pressable
              testID={`follow-done-${item.id}`}
              onPress={() => doneMut.mutate(String(item.id))}
              style={[styles.miniBtn, { backgroundColor: colors.successSoft }]}
            >
              <Icon name="check" size={18} color={colors.success} />
              <Text style={[styles.miniText, { color: colors.success }]}>Done</Text>
            </Pressable>
          )}
          <Pressable
            testID={`follow-preview-${item.id}`}
            onPress={() => setPreviewFor(String(item.id))}
            style={styles.miniBtn}
          >
            <Icon name="eye-outline" size={18} color={colors.brandPrimary} />
          </Pressable>
        </View>
      </Pressable>
    );
  };

  return (
    <View style={styles.screen}>
      <ScreenHeader
        title="Follow-ups"
        subtitle={`${followUps.filter((f) => !isFollowUpDone(f.status)).length} pending`}
        testID="follows-header"
      />

      <View style={styles.controls}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
          {FILTERS.map((f) => {
            const active = f.key === filter;
            return (
              <Pressable
                key={f.key}
                testID={`follows-filter-${f.key}`}
                onPress={() => setFilter(f.key)}
                style={[styles.chip, active && styles.chipActive]}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>{f.label}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {followQ.isLoading ? (
        <LoadingScreen />
      ) : (
        <SectionList
          testID="follows-list"
          sections={sections}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderItem}
          renderSectionHeader={({ section }) => (
            <Text style={styles.sectionHeader}>{section.title}</Text>
          )}
          stickySectionHeadersEnabled={false}
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: bottomChrome + spacing.xxl },
            sections.length === 0 && { flexGrow: 1 },
          ]}
          refreshControl={
            <RefreshControl refreshing={followQ.isRefetching} onRefresh={followQ.refetch} tintColor={colors.brandPrimary} />
          }
          ListEmptyComponent={
            <EmptyState
              testID="follows-empty"
              icon="check-all"
              title="Nothing here"
              subtitle={filter === "completed" ? "No completed follow-ups yet." : "You're all caught up on follow-ups."}
            />
          }
        />
      )}

      {/* Follow-up preview */}
      <BottomSheet
        visible={!!preview}
        onClose={() => setPreviewFor(null)}
        title="Follow-up"
        testID="follow-preview-sheet"
      >
        {preview && (
          <View style={{ gap: spacing.lg }}>
            <View style={styles.previewHead}>
              <View style={{ flex: 1 }}>
                <Text style={styles.previewName}>{previewLead?.name || "Follow-up"}</Text>
                <View style={{ flexDirection: "row", gap: spacing.sm, marginTop: spacing.sm, flexWrap: "wrap" }}>
                  {previewLead?.stage ? (
                    <Badge label={stageMeta(previewLead.stage).label} tone={stageMeta(previewLead.stage).tone} />
                  ) : null}
                  <Badge label={followUpStatusMeta(preview.status).label} tone={followUpStatusMeta(preview.status).tone} />
                </View>
              </View>
            </View>

            <View style={styles.previewMetaCard}>
              <PreviewRow icon="clock-outline" label="Due" value={formatDateTime(preview.due_at)} />
              {preview.kind ? <PreviewRow icon="tag-outline" label="Type" value={String(preview.kind).toUpperCase()} /> : null}
              {previewLead?.phone ? <PreviewRow icon="phone" label="Phone" value={previewLead.phone} /> : null}
            </View>

            <ContactActions
              leadId={preview.lead_id ? String(preview.lead_id) : undefined}
              phone={previewLead?.phone}
              labels
              message={`Hi ${previewLead?.name || ""}`}
            />

            {preview.notes ? (
              <View style={styles.previewNotes}>
                <Text style={styles.previewNotesLabel}>Notes</Text>
                <Text style={styles.previewNotesText}>{preview.notes}</Text>
              </View>
            ) : null}

            <View style={{ gap: spacing.sm }}>
              {!isFollowUpDone(preview.status) && (
                <Button
                  testID="preview-mark-done"
                  label="Mark as done"
                  icon="check-circle-outline"
                  onPress={() => doneMut.mutate(String(preview.id))}
                  loading={doneMut.isPending}
                />
              )}
              <View style={{ flexDirection: "row", gap: spacing.sm }}>
                <Button
                  testID="preview-reschedule"
                  label="Reschedule"
                  icon="calendar-edit"
                  variant="secondary"
                  style={{ flex: 1 }}
                  onPress={() => {
                    const id = String(preview.id);
                    setPreviewFor(null);
                    setRescheduleFor(id);
                  }}
                />
                <Button
                  testID="preview-add-note"
                  label="Add note"
                  icon="note-plus-outline"
                  variant="secondary"
                  style={{ flex: 1 }}
                  onPress={() => {
                    const id = String(preview.id);
                    setPreviewFor(null);
                    setNoteFor(id);
                  }}
                />
              </View>
              {previewLead?.id ? (
                <Button
                  testID="preview-open-lead"
                  label="Open lead"
                  icon="account-arrow-right-outline"
                  variant="ghost"
                  onPress={() => {
                    const lid = String(previewLead.id);
                    setPreviewFor(null);
                    router.push(`/leads/${lid}`);
                  }}
                />
              ) : null}
            </View>
          </View>
        )}
      </BottomSheet>

      <NoteSheet
        visible={!!noteFor}
        onClose={() => setNoteFor(null)}
        onSubmit={(t) => noteFor && noteMut.mutate({ id: noteFor, text: t })}
        submitting={noteMut.isPending}
        title="Add follow-up note"
      />
      <ScheduleSheet
        visible={!!rescheduleFor}
        onClose={() => setRescheduleFor(null)}
        onConfirm={(iso) => rescheduleFor && rescheduleMut.mutate({ id: rescheduleFor, iso })}
        submitting={rescheduleMut.isPending}
        title="Reschedule follow-up"
        confirmLabel="Reschedule"
      />
    </View>
  );
}

function PreviewRow({ icon, label, value }: { icon: string; label: string; value: string }) {
  const styles = useStyles();
  const { colors } = useTheme();
  return (
    <View style={styles.previewRow}>
      <Icon name={icon as any} size={16} color={colors.muted} />
      <Text style={styles.previewRowLabel}>{label}</Text>
      <Text style={styles.previewRowValue} numberOfLines={1}>{value}</Text>
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  screen: { flex: 1, backgroundColor: colors.surfaceSecondary },
  controls: {
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
    paddingVertical: spacing.sm,
  },
  chipsRow: { gap: spacing.sm, paddingHorizontal: spacing.lg },
  chip: {
    height: 36,
    justifyContent: "center",
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceTertiary,
    borderWidth: 1,
    borderColor: colors.border,
    flexShrink: 0,
  },
  chipActive: { backgroundColor: colors.brandPrimary, borderColor: colors.brandPrimary },
  chipText: { fontSize: 13, fontWeight: "700", color: colors.onSurfaceTertiary },
  chipTextActive: { color: colors.onBrandPrimary },
  listContent: { padding: spacing.lg, gap: spacing.sm },
  sectionHeader: {
    fontSize: 13,
    fontWeight: "800",
    color: colors.muted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.md,
    marginBottom: spacing.sm,
  },
  cardTop: { flexDirection: "row", alignItems: "flex-start", gap: spacing.md },
  name: { fontSize: 16, fontWeight: "700", color: colors.onSurface },
  timeRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 4 },
  time: { fontSize: 13, color: colors.muted, fontWeight: "600" },
  notesPreview: {
    fontSize: 13,
    color: colors.onSurfaceSecondary,
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.sm,
    padding: spacing.sm,
    lineHeight: 18,
  },
  cardActions: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  miniBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    height: 40,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceTertiary,
  },
  miniText: { fontSize: 13, fontWeight: "700" },

  previewHead: { flexDirection: "row", alignItems: "flex-start" },
  previewName: { fontSize: 20, fontWeight: "800", color: colors.onSurface },
  previewMetaCard: {
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.sm,
  },
  previewRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  previewRowLabel: { fontSize: 13, color: colors.muted, width: 54 },
  previewRowValue: { flex: 1, fontSize: 14, fontWeight: "600", color: colors.onSurface, textAlign: "right" },
  previewNotes: {
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.xs,
  },
  previewNotesLabel: { fontSize: 12, fontWeight: "800", color: colors.muted, textTransform: "uppercase" },
  previewNotesText: { fontSize: 14, color: colors.onSurface, lineHeight: 20 },
}));
