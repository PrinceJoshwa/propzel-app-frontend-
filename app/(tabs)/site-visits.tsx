import React, { useMemo, useState } from "react";
import {
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Icon from "@react-native-vector-icons/material-design-icons";

import { SiteVisit } from "@/src/api/crm";
import { leadIndex, useLeads, useSiteVisits } from "@/src/api/queries";
import { ContactActions } from "@/src/components/contact-actions";
import { ScreenHeader } from "@/src/components/header";
import { Badge, EmptyState, IconButton, LoadingScreen } from "@/src/components/ui";
import { formatDateTime } from "@/src/lib/format";
import { visitStatusMeta } from "@/src/lib/visit-status";
import { usesNativeTabs } from "@/src/navigation";
import { makeStyles, radius, spacing, useTheme } from "@/src/theme";

const FILTERS = [
  { key: "all", label: "All" },
  { key: "scheduled", label: "Scheduled" },
  { key: "completed", label: "Completed" },
];

export default function SiteVisitsScreen() {
  const insets = useSafeAreaInsets();
  const styles = useStyles();
  const { colors } = useTheme();
  const router = useRouter();

  const visitsQ = useSiteVisits();
  const leadsQ = useLeads();
  const visits = visitsQ.data ?? [];
  const byLead = useMemo(() => leadIndex(leadsQ.data ?? []), [leadsQ.data]);

  const [filter, setFilter] = useState("all");

  const data = useMemo(() => {
    const sorted = [...visits].sort((a, b) =>
      String(b.scheduled_at).localeCompare(String(a.scheduled_at)),
    );
    if (filter === "all") return sorted;
    if (filter === "completed")
      return sorted.filter((v) => String(v.status).toLowerCase() === "completed");
    // scheduled = everything not completed/cancelled
    return sorted.filter((v) => {
      const s = String(v.status || "scheduled").toLowerCase();
      return s !== "completed" && s !== "cancelled";
    });
  }, [visits, filter]);

  const bottomChrome = usesNativeTabs ? insets.bottom : 0;

  const renderItem = ({ item }: { item: SiteVisit }) => {
    const lead = byLead[String(item.lead_id)];
    const name = lead?.name || item.contact_name || "Site visit";
    const phone = item.contact_phone || lead?.phone;
    const meta = visitStatusMeta(item.status);
    return (
      <Pressable
        testID={`visit-row-${item.id}`}
        onPress={() => router.push(`/site-visits/${item.id}`)}
        style={({ pressed }) => [styles.card, pressed && { opacity: 0.85 }]}
      >
        <View style={styles.cardTop}>
          <View style={[styles.dateChip]}>
            <Icon name="calendar-clock" size={16} color={colors.brandPrimary} />
            <Text style={styles.dateText}>{formatDateTime(item.scheduled_at)}</Text>
          </View>
          <Badge label={meta.label} tone={meta.tone} />
        </View>
        <Text style={styles.name} numberOfLines={1}>
          {name}
        </Text>
        <View style={styles.cardBottom}>
          <Text style={styles.phone} numberOfLines={1}>
            {phone || "No contact number"}
          </Text>
          <ContactActions leadId={item.lead_id ? String(item.lead_id) : undefined} phone={phone} size="sm" message={`Hi ${name}`} />
        </View>
      </Pressable>
    );
  };

  return (
    <View style={styles.screen}>
      <ScreenHeader
        title="Site Visits"
        subtitle={`${visits.length} total`}
        testID="visits-header"
        right={
          <IconButton
            testID="visit-create-button"
            icon="plus"
            bg={colors.brandPrimary}
            color={colors.onBrandPrimary}
            onPress={() => router.push("/site-visits/new")}
          />
        }
      />

      <View style={styles.controls}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipsRow}
        >
          {FILTERS.map((f) => {
            const active = f.key === filter;
            return (
              <Pressable
                key={f.key}
                testID={`visits-filter-${f.key}`}
                onPress={() => setFilter(f.key)}
                style={[styles.chip, active && styles.chipActive]}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>
                  {f.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {visitsQ.isLoading ? (
        <LoadingScreen />
      ) : (
        <FlatList
          testID="visits-list"
          data={data}
          keyExtractor={(v) => String(v.id)}
          renderItem={renderItem}
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: bottomChrome + spacing.xxl },
            data.length === 0 && { flexGrow: 1 },
          ]}
          refreshControl={
            <RefreshControl
              refreshing={visitsQ.isRefetching}
              onRefresh={visitsQ.refetch}
              tintColor={colors.brandPrimary}
            />
          }
          ListEmptyComponent={
            <EmptyState
              testID="visits-empty"
              icon="map-marker-off-outline"
              title="No site visits"
              subtitle="Tap + to schedule a new site visit."
            />
          }
        />
      )}
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
  listContent: { padding: spacing.lg, gap: spacing.md },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  cardTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  dateChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.brandTertiary,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.pill,
  },
  dateText: { fontSize: 12, fontWeight: "700", color: colors.brandPrimary },
  name: { fontSize: 17, fontWeight: "800", color: colors.onSurface },
  cardBottom: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.md },
  phone: { flex: 1, fontSize: 14, color: colors.muted },
}));
