import React, { useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Icon from "@react-native-vector-icons/material-design-icons";

import { useAuth } from "@/src/auth/auth-context";
import { ScreenHeader } from "@/src/components/header";
import { Avatar, Button, Card } from "@/src/components/ui";
import { makeStyles, radius, spacing, useTheme } from "@/src/theme";

export default function Profile() {
  const insets = useSafeAreaInsets();
  const styles = useStyles();
  const { colors } = useTheme();
  const router = useRouter();
  const qc = useQueryClient();
  const { user, signOut } = useAuth();
  const [busy, setBusy] = useState(false);

  const onLogout = async () => {
    setBusy(true);
    await signOut();
    qc.clear();
    router.replace("/login");
  };

  const rows = [
    { icon: "email-outline", label: "Email", value: user?.email },
    { icon: "shield-account-outline", label: "Role", value: user?.role },
    { icon: "phone-outline", label: "Phone", value: user?.phone },
  ].filter((r) => r.value);

  return (
    <View style={styles.screen}>
      <ScreenHeader title="Profile" back testID="profile-header" />
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.xxl }]}
        showsVerticalScrollIndicator={false}
      >
        <Card style={styles.identity}>
          <Avatar name={user?.name || user?.email} size={72} />
          <Text style={styles.name}>{user?.name || "Propzel user"}</Text>
          {user?.role ? (
            <View style={styles.rolePill}>
              <Text style={styles.roleText}>{String(user.role).toUpperCase()}</Text>
            </View>
          ) : null}
        </Card>

        <Card style={{ padding: 0 }}>
          {rows.map((r, i) => (
            <View
              key={r.label}
              style={[styles.row, i < rows.length - 1 && styles.rowDivider]}
            >
              <Icon name={r.icon as any} size={20} color={colors.muted} />
              <Text style={styles.rowLabel}>{r.label}</Text>
              <Text style={styles.rowValue} numberOfLines={1}>
                {String(r.value)}
              </Text>
            </View>
          ))}
        </Card>

        <Button
          testID="logout-button"
          label="Log out"
          icon="logout-variant"
          variant="danger"
          onPress={onLogout}
          loading={busy}
        />

        <View style={styles.brand}>
          <Image
            source={require("../assets/images/propzel-logo.png")}
            style={styles.brandLogo}
            contentFit="contain"
          />
          <Text style={styles.brandText}>Propzel.tech · Real Estate CRM</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  screen: { flex: 1, backgroundColor: colors.surfaceSecondary },
  content: { padding: spacing.lg, gap: spacing.md },
  identity: { alignItems: "center", gap: spacing.md, paddingVertical: spacing.xl },
  name: { fontSize: 22, fontWeight: "800", color: colors.onSurface },
  rolePill: {
    backgroundColor: colors.brandTertiary,
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    borderRadius: radius.pill,
  },
  roleText: { color: colors.brandPrimary, fontWeight: "800", fontSize: 12, letterSpacing: 0.5 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.lg,
  },
  rowDivider: { borderBottomWidth: 1, borderBottomColor: colors.divider },
  rowLabel: { fontSize: 14, color: colors.muted, width: 60 },
  rowValue: { flex: 1, fontSize: 15, fontWeight: "600", color: colors.onSurface, textAlign: "right" },
  brand: { alignItems: "center", gap: spacing.sm, marginTop: spacing.xl },
  brandLogo: { width: 140, height: 44 },
  brandText: { fontSize: 12, color: colors.muted },
}));
