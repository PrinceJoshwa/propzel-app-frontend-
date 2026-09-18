import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Animated, StyleSheet, Text, View } from "react-native";
import Icon from "@react-native-vector-icons/material-design-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { makeStyles, radius, spacing, useTheme } from "@/src/theme";

type ToastType = "success" | "error" | "info";
type ToastItem = { message: string; type: ToastType };

type ToastCtx = { show: (message: string, type?: ToastType) => void };

const Ctx = createContext<ToastCtx | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toast, setToast] = useState<ToastItem | null>(null);
  const opacity = useMemo(() => new Animated.Value(0), []);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const insets = useSafeAreaInsets();
  const styles = useStyles();
  const { colors } = useTheme();

  const show = useCallback(
    (message: string, type: ToastType = "success") => {
      setToast({ message, type });
    },
    [],
  );

  useEffect(() => {
    if (!toast) return;
    Animated.timing(opacity, {
      toValue: 1,
      duration: 200,
      useNativeDriver: true,
    }).start();
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      Animated.timing(opacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start(() => setToast(null));
    }, 2600);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [toast, opacity]);

  const iconName =
    toast?.type === "error"
      ? "alert-circle"
      : toast?.type === "info"
        ? "information"
        : "check-circle";
  const tone =
    toast?.type === "error"
      ? colors.error
      : toast?.type === "info"
        ? colors.info
        : colors.success;

  return (
    <Ctx.Provider value={{ show }}>
      {children}
      {toast && (
        <Animated.View
          testID="app-toast"
          pointerEvents="none"
          style={[
            styles.wrap,
            { top: insets.top + spacing.sm, opacity },
          ]}
        >
          <View style={styles.toast}>
            <Icon name={iconName as any} size={20} color={tone} />
            <Text style={styles.text} numberOfLines={3}>
              {toast.message}
            </Text>
          </View>
        </Animated.View>
      )}
    </Ctx.Provider>
  );
}

export function useToast(): ToastCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}

const useStyles = makeStyles((colors) => ({
  wrap: {
    position: "absolute",
    left: spacing.lg,
    right: spacing.lg,
    alignItems: "center",
    zIndex: 1000,
  },
  toast: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    maxWidth: 480,
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  text: {
    flex: 1,
    color: colors.onSurface,
    fontSize: 14,
    fontWeight: "600",
  },
}));
