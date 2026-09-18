// Design tokens for Propzel.tech — light theme.
// Emerald green identity (#034631) with a gold secondary accent from the logo.
// Keys match the "color" block of design_guidelines.json. Build sheets with
// makeStyles() and read useTheme().colors for color props. Never write color
// literals in components.

import { useMemo } from "react";
import { Appearance, StyleSheet, useColorScheme } from "react-native";

export type ColorScheme = "light" | "dark";

const light = {
  // Surfaces
  surface: "#FFFFFF",
  onSurface: "#12211B",
  surfaceSecondary: "#F5F7F5",
  onSurfaceSecondary: "#2C3A33",
  surfaceTertiary: "#ECF1EE",
  onSurfaceTertiary: "#47554E",
  surfaceInverse: "#034631",
  onSurfaceInverse: "#FFFFFF",
  muted: "#6B7A72",

  // Brand (emerald)
  brand: "#034631",
  onBrand: "#FFFFFF",
  brandPrimary: "#034631",
  onBrandPrimary: "#FFFFFF",
  brandSecondary: "#E1EDE7",
  onBrandSecondary: "#034631",
  brandTertiary: "#EAF2EE",
  onBrandTertiary: "#034631",

  // Gold accent
  accent: "#C4A24A",
  onAccent: "#12211B",
  accentSoft: "#F7EFD8",
  onAccentSoft: "#7A5E17",

  // Status
  success: "#157347",
  onSuccess: "#FFFFFF",
  successSoft: "#E3F2E9",
  warning: "#B45309",
  onWarning: "#FFFFFF",
  warningSoft: "#FBEEDD",
  error: "#B91C1C",
  onError: "#FFFFFF",
  errorSoft: "#FBE7E7",
  info: "#1D4ED8",
  onInfo: "#FFFFFF",
  infoSoft: "#E5ECFB",

  // Lines
  border: "#E4EAE7",
  borderStrong: "#CBD6D0",
  divider: "#EEF2F0",
};

export type ThemeColors = typeof light;

export const defaultScheme = "light" satisfies ColorScheme;

export const themes: { light: ThemeColors; dark?: ThemeColors } = { light };

export function setColorScheme(scheme: ColorScheme | null) {
  Appearance.setColorScheme?.(scheme ?? "unspecified");
}

setColorScheme?.(themes.dark ? null : defaultScheme);

export function useTheme(): { scheme: ColorScheme; colors: ThemeColors } {
  const system = useColorScheme();
  const scheme: ColorScheme =
    system === "dark" && themes.dark ? "dark" : defaultScheme;
  return { scheme, colors: themes[scheme] ?? themes.light };
}

export function makeStyles<T extends StyleSheet.NamedStyles<T> | StyleSheet.NamedStyles<any>>(
  factory: (colors: ThemeColors) => T & StyleSheet.NamedStyles<any>,
): () => T {
  return function useStyles(): T {
    const { colors } = useTheme();
    return useMemo(() => StyleSheet.create(factory(colors)), [colors]);
  };
}

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
};

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 22,
  pill: 999,
};
