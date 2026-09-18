import React from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  TextStyle,
  View,
  ViewStyle,
} from "react-native";
import Icon from "@react-native-vector-icons/material-design-icons";

import { makeStyles, radius, spacing, useTheme } from "@/src/theme";

type IconName = React.ComponentProps<typeof Icon>["name"];

// ---------------------------------------------------------------------------
// Button
// ---------------------------------------------------------------------------
export function Button({
  label,
  onPress,
  variant = "primary",
  icon,
  loading,
  disabled,
  style,
  testID,
}: {
  label: string;
  onPress?: () => void;
  variant?: "primary" | "secondary" | "ghost" | "danger";
  icon?: IconName;
  loading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}) {
  const s = useButtonStyles();
  const { colors } = useTheme();
  const isDisabled = disabled || loading;
  const fg =
    variant === "primary"
      ? colors.onBrandPrimary
      : variant === "danger"
        ? colors.onError
        : colors.brandPrimary;
  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        s.base,
        s[variant],
        pressed && !isDisabled && s.pressed,
        isDisabled && s.disabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={fg} size="small" />
      ) : (
        <>
          {icon && <Icon name={icon} size={18} color={fg} />}
          <Text style={[s.label, { color: fg }]}>{label}</Text>
        </>
      )}
    </Pressable>
  );
}

const useButtonStyles = makeStyles((colors) => ({
  base: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    height: 50,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
  },
  primary: { backgroundColor: colors.brandPrimary },
  secondary: {
    backgroundColor: colors.brandSecondary,
  },
  ghost: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: colors.border,
  },
  danger: { backgroundColor: colors.error },
  pressed: { opacity: 0.85 },
  disabled: { opacity: 0.5 },
  label: { fontSize: 15, fontWeight: "700" },
}));

// ---------------------------------------------------------------------------
// IconButton — circular tappable icon
// ---------------------------------------------------------------------------
export function IconButton({
  icon,
  onPress,
  color,
  bg,
  size = 44,
  testID,
}: {
  icon: IconName;
  onPress?: () => void;
  color?: string;
  bg?: string;
  size?: number;
  testID?: string;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      style={({ pressed }) => [
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: bg ?? colors.surfaceTertiary,
        },
        pressed && { opacity: 0.7 },
      ]}
    >
      <Icon name={icon} size={size * 0.5} color={color ?? colors.brandPrimary} />
    </Pressable>
  );
}

// ---------------------------------------------------------------------------
// Card
// ---------------------------------------------------------------------------
export function Card({
  children,
  style,
  onPress,
  testID,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
  testID?: string;
}) {
  const s = useCardStyles();
  if (onPress) {
    return (
      <Pressable
        testID={testID}
        onPress={onPress}
        style={({ pressed }) => [s.card, pressed && s.pressed, style]}
      >
        {children}
      </Pressable>
    );
  }
  return (
    <View testID={testID} style={[s.card, style]}>
      {children}
    </View>
  );
}

const useCardStyles = makeStyles((colors) => ({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    padding: spacing.lg,
  },
  pressed: { opacity: 0.85 },
}));

// ---------------------------------------------------------------------------
// Badge — colored status pill
// ---------------------------------------------------------------------------
export function Badge({
  label,
  tone,
  style,
  testID,
}: {
  label: string;
  tone: string;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}) {
  return (
    <View
      testID={testID}
      style={[
        {
          alignSelf: "flex-start",
          flexDirection: "row",
          alignItems: "center",
          gap: 6,
          paddingHorizontal: 10,
          paddingVertical: 5,
          borderRadius: radius.pill,
          backgroundColor: tone + "1A",
        },
        style,
      ]}
    >
      <View
        style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: tone }}
      />
      <Text style={{ color: tone, fontSize: 12, fontWeight: "700" }}>
        {label}
      </Text>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Field — labeled text input
// ---------------------------------------------------------------------------
export function Field({
  label,
  style,
  inputStyle,
  right,
  ...props
}: TextInputProps & {
  label?: string;
  style?: StyleProp<ViewStyle>;
  inputStyle?: StyleProp<TextStyle>;
  right?: React.ReactNode;
}) {
  const s = useFieldStyles();
  const { colors } = useTheme();
  return (
    <View style={[s.wrap, style]}>
      {label && <Text style={s.label}>{label}</Text>}
      <View style={s.inputRow}>
        <TextInput
          placeholderTextColor={colors.muted}
          style={[s.input, inputStyle]}
          {...props}
        />
        {right}
      </View>
    </View>
  );
}

const useFieldStyles = makeStyles((colors) => ({
  wrap: { gap: spacing.sm },
  label: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.onSurfaceTertiary,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surfaceTertiary,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
  },
  input: {
    flex: 1,
    height: 50,
    fontSize: 15,
    color: colors.onSurface,
  },
}));

// ---------------------------------------------------------------------------
// EmptyState
// ---------------------------------------------------------------------------
export function EmptyState({
  icon = "inbox-outline",
  title,
  subtitle,
  testID,
}: {
  icon?: IconName;
  title: string;
  subtitle?: string;
  testID?: string;
}) {
  const { colors } = useTheme();
  return (
    <View
      testID={testID}
      style={{
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: spacing.xxl,
        paddingHorizontal: spacing.xl,
        gap: spacing.sm,
      }}
    >
      <View
        style={{
          width: 72,
          height: 72,
          borderRadius: 36,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: colors.brandTertiary,
        }}
      >
        <Icon name={icon} size={34} color={colors.brandPrimary} />
      </View>
      <Text
        style={{
          fontSize: 16,
          fontWeight: "700",
          color: colors.onSurface,
          marginTop: spacing.sm,
        }}
      >
        {title}
      </Text>
      {subtitle && (
        <Text
          style={{
            fontSize: 14,
            color: colors.muted,
            textAlign: "center",
            lineHeight: 20,
          }}
        >
          {subtitle}
        </Text>
      )}
    </View>
  );
}

// ---------------------------------------------------------------------------
// LoadingScreen
// ---------------------------------------------------------------------------
export function LoadingScreen({ testID }: { testID?: string }) {
  const { colors } = useTheme();
  return (
    <View
      testID={testID ?? "loading-screen"}
      style={{
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: colors.surface,
      }}
    >
      <ActivityIndicator size="large" color={colors.brandPrimary} />
    </View>
  );
}

// ---------------------------------------------------------------------------
// Avatar — initials circle
// ---------------------------------------------------------------------------
export function Avatar({ name, size = 44 }: { name?: string; size?: number }) {
  const { colors } = useTheme();
  const initials = (name || "?")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: colors.brandTertiary,
      }}
    >
      <Text
        style={{
          color: colors.brandPrimary,
          fontWeight: "800",
          fontSize: size * 0.36,
        }}
      >
        {initials || "?"}
      </Text>
    </View>
  );
}

// ---------------------------------------------------------------------------
// SectionTitle
// ---------------------------------------------------------------------------
export function SectionTitle({
  children,
  right,
}: {
  children: React.ReactNode;
  right?: React.ReactNode;
}) {
  const { colors } = useTheme();
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: spacing.md,
      }}
    >
      <Text style={{ fontSize: 17, fontWeight: "800", color: colors.onSurface }}>
        {children}
      </Text>
      {right}
    </View>
  );
}

export type { IconName };
