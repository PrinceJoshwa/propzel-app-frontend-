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

import { Lead } from "@/src/api/crm";
import { useLeads } from "@/src/api/queries";
import { ContactActions } from "@/src/components/contact-actions";
import { ScreenHeader } from "@/src/components/header";
import {
  Avatar,
  Badge,
  EmptyState,
  Field,
  LoadingScreen,
} from "@/src/components/ui";
import { relativeTime } from "@/src/lib/format";
import { stageMeta } from "@/src/lib/stages";
import { usesNativeTabs } from "@/src/navigation";
import { makeStyles, radius, spacing, useTheme } from "@/src/theme";

export default function LeadsScreen() {
  const insets = useSafeAreaInsets();
  const styles = useStyles();
  const { colors } = useTheme();
  const router = useRouter();
  const leadsQ = useLeads();
  const leads = leadsQ.data ?? [];

  const [query, setQuery] = useState("");
  const [stage, setStage] = useState<string>("all");

  const filters = useMemo(() => {
    const counts: Record<string, number> = {};
    leads.forEach((l) => {
      const k = l.stage || "unknown";
      counts[k] = (counts[k] || 0) + 1;
    });
    const present = Object.keys(counts);
    return [
      { key: "all", label: "All", count: leads.length },
      ...present.map((k) => ({
        key: k,
        label: stageMeta(k).label,
        count: counts[k],
      })),
    ];
  }, [leads]);

  const data = useMemo(() => {
    const q = query.trim().toLowerCase();
    return leads.filter((l) => {
      if (stage !== "all" && (l.stage || "unknown") !== stage) return false;
      if (!q) return true;
      return (
        (l.name || "").toLowerCase().includes(q) ||
        (l.phone || "").toLowerCase().includes(q) ||
        (l.email || "").toLowerCase().includes(q)
      );
    });
  }, [leads, query, stage]);

  const bottomChrome = usesNativeTabs ? insets.bottom : 0;

  const renderItem = ({ item }: { item: Lead }) => {
    const st = stageMeta(item.stage);
    return (
      <Pressable
        testID={`lead-row-${item.id}`}
        onPress={() => router.push(`/leads/${item.id}`)}
        style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
      >
        <Avatar name={item.name} size={46} />
        <View style={{ flex: 1, gap: 4 }}>
          <Text style={styles.name} numberOfLines={1}>
            {item.name || "Unnamed lead"}
          </Text>
          <Badge label={st.label} tone={st.tone} />
          <Text style={styles.meta} numberOfLines={1}>
            {item.phone || "No phone"} · {relativeTime(item.last_activity_at || item.updated_at || item.created_at)}
          </Text>
        </View>
        <ContactActions leadId={String(item.id)} phone={item.phone} size="sm" message={`Hi ${item.name || ""}`} />
      </Pressable>
    );
  };

  return (
    <View style={styles.screen}>
      <ScreenHeader
        title="Leads"
        subtitle={`${leads.length} total`}
        testID="leads-header"
      />

      {/* Search + filter chips (sticky above list) */}
      <View style={styles.controls}>
        <Field
          testID="leads-search-input"
          value={query}
          onChangeText={setQuery}
          placeholder="Search name, phone or email"
          autoCapitalize="none"
          inputStyle={{ height: 44 }}
          right={<Icon name="magnify" size={20} color={colors.muted} />}
        />
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipsRow}
        >
          {filters.map((f) => {
            const active = f.key === stage;
            return (
              <Pressable
                key={f.key}
                testID={`leads-filter-${f.key}`}
                onPress={() => setStage(f.key)}
                style={[styles.chip, active && styles.chipActive]}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>
                  {f.label} · {f.count}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {leadsQ.isLoading ? (
        <LoadingScreen />
      ) : (
        <FlatList
          testID="leads-list"
          data={data}
          keyExtractor={(l) => String(l.id)}
          renderItem={renderItem}
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: bottomChrome + spacing.xxl },
            data.length === 0 && { flexGrow: 1 },
          ]}
          ItemSeparatorComponent={() => <View style={styles.sep} />}
          refreshControl={
            <RefreshControl
              refreshing={leadsQ.isRefetching}
              onRefresh={leadsQ.refetch}
              tintColor={colors.brandPrimary}
            />
          }
          ListEmptyComponent={
            <EmptyState
              testID="leads-empty"
              icon="account-search-outline"
              title="No leads found"
              subtitle={
                query || stage !== "all"
                  ? "Try a different search or filter."
                  : "Leads assigned to you will appear here."
              }
            />
          }
        />
      )}
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  screen: { flex: 1, backgroundColor: colors.surface },
  controls: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  chipsRow: { gap: spacing.sm, paddingRight: spacing.lg },
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
  chipActive: {
    backgroundColor: colors.brandPrimary,
    borderColor: colors.brandPrimary,
  },
  chipText: { fontSize: 13, fontWeight: "700", color: colors.onSurfaceTertiary },
  chipTextActive: { color: colors.onBrandPrimary },
  listContent: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: spacing.md,
  },
  rowPressed: { opacity: 0.7 },
  name: { fontSize: 16, fontWeight: "700", color: colors.onSurface },
  meta: { fontSize: 13, color: colors.muted },
  sep: { height: 1, backgroundColor: colors.divider },
}));
