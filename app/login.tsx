import React, { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { Image } from "expo-image";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import Icon from "@react-native-vector-icons/material-design-icons";

import { useAuth } from "@/src/auth/auth-context";
import { useToast } from "@/src/components/toast";
import { Button, Field } from "@/src/components/ui";
import { ApiError } from "@/src/api/client";
import { makeStyles, radius, spacing, useTheme } from "@/src/theme";

const DEMO_ROLES = [
  { role: "Admin", email: "admin@tasko.com", password: "admin123", icon: "shield-crown-outline" },
  { role: "Manager", email: "manager@tasko.com", password: "manager123", icon: "account-tie-outline" },
  { role: "Executive", email: "priya@tasko.com", password: "executive123", icon: "account-outline" },
] as const;

export default function Login() {
  const insets = useSafeAreaInsets();
  const styles = useStyles();
  const { colors } = useTheme();
  const { signIn } = useAuth();
  const toast = useToast();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [busy, setBusy] = useState(false);

  const onSubmit = async () => {
    if (!email.trim() || !password) {
      toast.show("Enter your email and password", "error");
      return;
    }
    setBusy(true);
    try {
      await signIn(email, password);
      router.replace("/(tabs)");
    } catch (e) {
      const msg =
        e instanceof ApiError
          ? e.status === 401
            ? "Invalid email or password"
            : e.message
          : "Couldn't reach the server. Check your connection.";
      toast.show(msg, "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.screen}>
      <KeyboardAwareScrollView
        bottomOffset={24}
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + spacing.xxl, paddingBottom: insets.bottom + spacing.xl },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <Image
          source={require("../assets/images/propzel-logo.png")}
          style={styles.logo}
          contentFit="contain"
        />

        <View style={styles.hero}>
          <Text style={styles.title}>Welcome back</Text>
          <Text style={styles.subtitle}>
            Sign in to your Propzel workspace to manage leads, site visits and
            follow-ups on the go.
          </Text>
        </View>

        <View style={styles.form}>
          <Field
            testID="login-email-input"
            label="Email"
            value={email}
            onChangeText={setEmail}
            placeholder="you@company.com"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />
          <Field
            testID="login-password-input"
            label="Password"
            value={password}
            onChangeText={setPassword}
            placeholder="••••••••"
            secureTextEntry={!showPw}
            autoCapitalize="none"
            onSubmitEditing={onSubmit}
            returnKeyType="go"
            right={
              <Pressable
                testID="login-toggle-password"
                onPress={() => setShowPw((v) => !v)}
                hitSlop={10}
              >
                <Icon
                  name={showPw ? "eye-off-outline" : "eye-outline"}
                  size={22}
                  color={colors.muted}
                />
              </Pressable>
            }
          />
          <Button
            testID="login-submit-button"
            label="Enter workspace"
            onPress={onSubmit}
            loading={busy}
            icon="login-variant"
            style={{ marginTop: spacing.sm }}
          />
        </View>

        <View style={styles.rolesWrap}>
          <Text style={styles.rolesLabel}>Try a seeded role</Text>
          <View style={styles.rolesRow}>
            {DEMO_ROLES.map((r) => {
              const active = email === r.email;
              return (
                <Pressable
                  key={r.email}
                  testID={`login-role-${r.role.toLowerCase()}`}
                  onPress={() => {
                    setEmail(r.email);
                    setPassword(r.password);
                  }}
                  style={[styles.roleChip, active && styles.roleChipActive]}
                >
                  <Icon
                    name={r.icon as any}
                    size={20}
                    color={active ? colors.onBrandPrimary : colors.brandPrimary}
                  />
                  <Text
                    style={[styles.roleName, active && styles.roleNameActive]}
                  >
                    {r.role}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          <Text style={styles.hint}>
            Tapping a role fills its login so you can jump straight into the
            workspace.
          </Text>
        </View>
      </KeyboardAwareScrollView>
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  screen: { flex: 1, backgroundColor: colors.surface },
  content: { paddingHorizontal: spacing.xl, gap: spacing.xl },
  logo: { width: 200, height: 64, alignSelf: "flex-start" },
  hero: { gap: spacing.sm },
  title: { fontSize: 28, fontWeight: "800", color: colors.onSurface },
  subtitle: { fontSize: 15, color: colors.muted, lineHeight: 22 },
  form: { gap: spacing.lg },
  rolesWrap: { gap: spacing.md },
  rolesLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.onSurfaceTertiary,
  },
  rolesRow: { flexDirection: "row", gap: spacing.sm },
  roleChip: {
    flex: 1,
    alignItems: "center",
    gap: spacing.xs,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceTertiary,
    borderWidth: 1,
    borderColor: colors.border,
  },
  roleChipActive: {
    backgroundColor: colors.brandPrimary,
    borderColor: colors.brandPrimary,
  },
  roleName: { fontSize: 13, fontWeight: "700", color: colors.onSurface },
  roleNameActive: { color: colors.onBrandPrimary },
  hint: { fontSize: 12, color: colors.muted, lineHeight: 18 },
}));
