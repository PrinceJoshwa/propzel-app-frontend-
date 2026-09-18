import React from "react";
import { Platform, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { IconButton } from "@/src/components/ui";
import { makeStyles, spacing, useTheme } from "@/src/theme";

// Sticky, safe-area-aware screen header. White surface with a hairline divider.
export function ScreenHeader({
  title,
  subtitle,
  back,
  right,
  testID,
}: {
  title: string;
  subtitle?: string;
  back?: boolean;
  right?: React.ReactNode;
  testID?: string;
}) {
  const insets = useSafeAreaInsets();
  const styles = useStyles();
  const router = useRouter();
  const { colors } = useTheme();

  return (
    <View
      testID={testID}
      style={[styles.wrap, { paddingTop: insets.top + spacing.sm }]}
    >
      <View style={styles.row}>
        {back ? (
          <IconButton
            testID="header-back-button"
            icon={Platform.OS === "ios" ? "chevron-left" : "arrow-left"}
            onPress={() => router.back()}
            bg={colors.surfaceTertiary}
          />
        ) : (
          <View style={styles.spacer} />
        )}
        <View style={styles.titles}>
          <Text style={styles.title} numberOfLines={1}>
            {title}
          </Text>
          {subtitle ? (
            <Text style={styles.subtitle} numberOfLines={1}>
              {subtitle}
            </Text>
          ) : null}
        </View>
        <View style={styles.rightWrap}>{right ?? <View style={styles.spacer} />}</View>
      </View>
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  wrap: {
    backgroundColor: colors.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    minHeight: 44,
  },
  titles: { flex: 1 },
  title: { fontSize: 20, fontWeight: "800", color: colors.onSurface },
  subtitle: { fontSize: 13, color: colors.muted, marginTop: 2 },
  spacer: { width: 44, height: 44 },
  rightWrap: { minWidth: 44, alignItems: "flex-end" },
}));
