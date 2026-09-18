import React, { useMemo, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Icon from "@react-native-vector-icons/material-design-icons";

import { projectsApi, siteVisitsApi } from "@/src/api/crm";
import { qk, useLeads } from "@/src/api/queries";
import { ScheduleSheet } from "@/src/components/schedule-sheet";
import { useToast } from "@/src/components/toast";
import { Avatar, Button, Field, IconButton } from "@/src/components/ui";
import { formatDateTime } from "@/src/lib/format";
import { stageMeta } from "@/src/lib/stages";
import { makeStyles, radius, spacing, useTheme } from "@/src/theme";

export default function NewSiteVisit() {
  const insets = useSafeAreaInsets();
  const styles = useStyles();
  const { colors } = useTheme();
  const router = useRouter();
  const toast = useToast();
  const qc = useQueryClient();

  const leadsQ = useLeads();
  const projectsQ = useQuery({
    queryKey: ["projects"],
    queryFn: async () => {
      const d: any = await projectsApi.list();
      return Array.isArray(d) ? d : d?.items || d?.data || [];
    },
  });

  const [search, setSearch] = useState("");
  const [leadId, setLeadId] = useState<string | null>(null);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [scheduledAt, setScheduledAt] = useState<string | null>(null);
  const [scheduleOpen, setScheduleOpen] = useState(false);

  const leads = leadsQ.data ?? [];
  const projects = projectsQ.data ?? [];
  const selectedLead = leads.find((l) => String(l.id) === leadId);

  const filteredLeads = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return leads.slice(0, 30);
    return leads
      .filter(
        (l) =>
          (l.name || "").toLowerCase().includes(q) ||
          (l.phone || "").toLowerCase().includes(q),
      )
      .slice(0, 30);
  }, [leads, search]);

  const createMut = useMutation({
    mutationFn: () => {
      const body: Record<string, any> = {
        lead_id: leadId,
        scheduled_at: scheduledAt,
      };
      const pid = projectId || selectedLead?.project_id;
      if (pid) body.project_id = pid;
      if (selectedLead?.assigned_to) body.presales_owner_id = selectedLead.assigned_to;
      return siteVisitsApi.create(body);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.siteVisits });
      toast.show("Site visit scheduled");
      router.back();
    },
    onError: () => toast.show("Couldn't schedule site visit", "error"),
  });

  const canSubmit = !!leadId && !!scheduledAt && !createMut.isPending;

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.title}>New site visit</Text>
        <IconButton
          testID="new-visit-close"
          icon="close"
          size={38}
          bg={colors.surfaceTertiary}
          color={colors.onSurfaceTertiary}
          onPress={() => router.back()}
        />
      </View>

      <KeyboardAwareScrollView
        bottomOffset={20}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.label}>Choose a lead</Text>
        <Field
          testID="new-visit-lead-search"
          value={search}
          onChangeText={setSearch}
          placeholder="Search leads by name or phone"
          autoCapitalize="none"
          inputStyle={{ height: 44 }}
          right={<Icon name="magnify" size={20} color={colors.muted} />}
        />
        <View style={styles.leadList}>
          {filteredLeads.map((l) => {
            const active = String(l.id) === leadId;
            const st = stageMeta(l.stage);
            return (
              <Pressable
                key={l.id}
                testID={`new-visit-lead-${l.id}`}
                onPress={() => {
                  setLeadId(String(l.id));
                  setProjectId(l.project_id ? String(l.project_id) : null);
                }}
                style={[styles.leadRow, active && styles.leadRowActive]}
              >
                <Avatar name={l.name} size={38} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.leadName} numberOfLines={1}>
                    {l.name || "Unnamed lead"}
                  </Text>
                  <Text style={styles.leadMeta} numberOfLines={1}>
                    {st.label} · {l.phone || "No phone"}
                  </Text>
                </View>
                <Icon
                  name={active ? "check-circle" : "circle-outline"}
                  size={22}
                  color={active ? colors.brandPrimary : colors.border}
                />
              </Pressable>
            );
          })}
          {filteredLeads.length === 0 && (
            <Text style={styles.leadMeta}>No leads match your search.</Text>
          )}
        </View>

        {projects.length > 0 && (
          <>
            <Text style={styles.label}>Project</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.projRow}>
              {projects.map((p: any) => {
                const active = String(p.id) === projectId;
                return (
                  <Pressable
                    key={p.id}
                    testID={`new-visit-project-${p.id}`}
                    onPress={() => setProjectId(String(p.id))}
                    style={[styles.projChip, active && styles.projChipActive]}
                  >
                    <Text style={[styles.projText, active && styles.projTextActive]}>
                      {p.name || "Project"}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </>
        )}

        <Text style={styles.label}>Date & time</Text>
        <Pressable
          testID="new-visit-datetime"
          onPress={() => setScheduleOpen(true)}
          style={styles.dateBtn}
        >
          <Icon name="calendar-clock" size={20} color={colors.brandPrimary} />
          <Text style={[styles.dateBtnText, !scheduledAt && { color: colors.muted }]}>
            {scheduledAt ? formatDateTime(scheduledAt) : "Pick date & time"}
          </Text>
          <Icon name="chevron-right" size={22} color={colors.muted} />
        </Pressable>

        <Button
          testID="new-visit-submit"
          label="Schedule site visit"
          icon="check"
          onPress={() => createMut.mutate()}
          disabled={!canSubmit}
          loading={createMut.isPending}
          style={{ marginTop: spacing.lg, marginBottom: insets.bottom + spacing.lg }}
        />
      </KeyboardAwareScrollView>

      <ScheduleSheet
        visible={scheduleOpen}
        onClose={() => setScheduleOpen(false)}
        onConfirm={(iso) => {
          setScheduledAt(iso);
          setScheduleOpen(false);
        }}
        title="Site visit date & time"
        confirmLabel="Set date & time"
      />
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  screen: { flex: 1, backgroundColor: colors.surface },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  title: { fontSize: 20, fontWeight: "800", color: colors.onSurface },
  content: { padding: spacing.lg, gap: spacing.md },
  label: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.onSurfaceTertiary,
    marginTop: spacing.sm,
  },
  leadList: { gap: spacing.xs },
  leadRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  leadRowActive: { borderColor: colors.brandPrimary, backgroundColor: colors.brandTertiary },
  leadName: { fontSize: 15, fontWeight: "700", color: colors.onSurface },
  leadMeta: { fontSize: 13, color: colors.muted },
  projRow: { gap: spacing.sm, paddingVertical: spacing.xs },
  projChip: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceTertiary,
    borderWidth: 1,
    borderColor: colors.border,
    flexShrink: 0,
  },
  projChipActive: { backgroundColor: colors.brandPrimary, borderColor: colors.brandPrimary },
  projText: { fontSize: 13, fontWeight: "700", color: colors.onSurfaceTertiary },
  projTextActive: { color: colors.onBrandPrimary },
  dateBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    height: 52,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceTertiary,
  },
  dateBtnText: { flex: 1, fontSize: 15, fontWeight: "600", color: colors.onSurface },
}));
