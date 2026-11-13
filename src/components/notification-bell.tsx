import React, { useEffect, useMemo, useState } from "react";
import { FlatList, Modal, Pressable, Text, View } from "react-native";
import Icon from "@react-native-vector-icons/material-design-icons";
import { useRouter } from "expo-router";

import { CrmNotification, notificationsApi } from "@/src/api/crm";
import { useLeads } from "@/src/api/queries";
import { IconButton } from "@/src/components/ui";
import { makeStyles, radius, spacing, useTheme } from "@/src/theme";

function leadId(item: CrmNotification): string | undefined {
  const id = item.meta?.lead_id || item.meta?.leadId;
  return id ? String(id) : undefined;
}

function displayName(item: CrmNotification, mappedName?: string): string {
  return String(item.meta?.lead_name || item.meta?.customer_name || mappedName || item.message?.split(" · ")[0] || "Customer");
}

export function NotificationBell() {
  const { colors } = useTheme();
  const styles = useStyles();
  const router = useRouter();
  const leadsQ = useLeads();
  const [items, setItems] = useState<CrmNotification[]>([]);
  const [unread, setUnread] = useState(0);
  const [visible, setVisible] = useState(false);

  const names = useMemo(() => Object.fromEntries((leadsQ.data || []).filter((lead) => lead.id && lead.name).map((lead) => [String(lead.id), lead.name as string])), [leadsQ.data]);

  const load = async () => {
    try {
      const next = await notificationsApi.list();
      setItems(next?.items || []);
      setUnread(next?.unread || 0);
    } catch {
      // Notifications are supplementary to the CRM.
    }
  };

  useEffect(() => {
    const initialLoad = setTimeout(() => {
      void load();
    }, 0);
    const timer = setInterval(() => {
      void load();
    }, 8000);
    return () => {
      clearTimeout(initialLoad);
      clearInterval(timer);
    };
  }, []);

  const openNotification = async (item: CrmNotification) => {
    if (!item.read) {
      try { await notificationsApi.markRead(item.id); } catch { /* keep navigation available */ }
    }
    setVisible(false);
    const id = leadId(item);
    if (id) router.push(`/leads/${id}`);
    else if (item.link?.startsWith("/leads/")) router.push(item.link as any);
    load();
  };

  return (
    <>
      <View>
        <IconButton testID="notifications-button" icon={unread > 0 ? "bell-ring-outline" : "bell-outline"} bg={colors.surfaceTertiary} onPress={() => setVisible(true)} />
        {unread > 0 ? <View style={styles.badge}><Text style={styles.badgeText}>{unread > 99 ? "99+" : unread}</Text></View> : null}
      </View>
      <Modal visible={visible} transparent animationType="slide" onRequestClose={() => setVisible(false)}>
        <Pressable style={styles.backdrop} onPress={() => setVisible(false)}>
          <Pressable style={styles.sheet} onPress={(event) => event.stopPropagation()}>
            <View style={styles.sheetHeader}>
              <View><Text style={styles.title}>Notifications</Text><Text style={styles.subtitle}>{unread} unread</Text></View>
              <IconButton icon="close" onPress={() => setVisible(false)} bg={colors.surfaceTertiary} />
            </View>
            <FlatList
              data={items}
              keyExtractor={(item) => String(item.id)}
              contentContainerStyle={items.length ? styles.list : styles.emptyList}
              ListEmptyComponent={<Text style={styles.emptyText}>You&apos;re all caught up.</Text>}
              renderItem={({ item }) => {
                const name = displayName(item, names[leadId(item) || ""]);
                return <Pressable testID={`notification-item-${item.id}`} onPress={() => openNotification(item)} style={[styles.item, !item.read && styles.unreadItem]}>
                  <Icon name={item.type === "missed_call" ? "phone-missed" : "bell-ring-outline"} size={22} color={colors.brandPrimary} />
                  <View style={styles.itemBody}><Text style={styles.itemTitle}>{item.title || "Notification"}</Text><Text style={styles.itemName}>{name}</Text><Text style={styles.itemMessage} numberOfLines={2}>{item.message || "Open customer details"}</Text></View>
                  <Icon name="chevron-right" size={20} color={colors.muted} />
                </Pressable>;
              }}
            />
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const useStyles = makeStyles((colors) => ({
  badge: { position: "absolute", top: -3, right: -3, minWidth: 18, height: 18, paddingHorizontal: 4, borderRadius: 9, alignItems: "center", justifyContent: "center", backgroundColor: colors.error },
  badgeText: { color: colors.onBrandPrimary, fontSize: 10, fontWeight: "800" },
  backdrop: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.35)" },
  sheet: { maxHeight: "82%", backgroundColor: colors.surface, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, paddingTop: spacing.lg, paddingBottom: spacing.xl },
  sheetHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: spacing.lg, paddingBottom: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
  title: { color: colors.onSurface, fontSize: 20, fontWeight: "800" }, subtitle: { color: colors.muted, fontSize: 12, marginTop: 2 },
  list: { padding: spacing.lg, gap: spacing.sm }, emptyList: { flexGrow: 1, minHeight: 180, alignItems: "center", justifyContent: "center", padding: spacing.lg }, emptyText: { color: colors.muted, fontSize: 14 },
  item: { flexDirection: "row", alignItems: "center", gap: spacing.md, padding: spacing.md, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface }, unreadItem: { backgroundColor: colors.surfaceTertiary, borderColor: colors.brandPrimary }, itemBody: { flex: 1, gap: 2 }, itemTitle: { color: colors.onSurface, fontSize: 13, fontWeight: "800" }, itemName: { color: colors.brandPrimary, fontSize: 14, fontWeight: "800" }, itemMessage: { color: colors.muted, fontSize: 12 },
}));
