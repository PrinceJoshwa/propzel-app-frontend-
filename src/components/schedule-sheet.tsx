import React, { useMemo, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { addDays, format, isSameDay, setHours, setMinutes } from "date-fns";

import { BottomSheet } from "@/src/components/sheet";
import { Button } from "@/src/components/ui";
import { makeStyles, radius, spacing, useTheme } from "@/src/theme";

const TIME_SLOTS = [
  { label: "9:00 AM", h: 9, m: 0 },
  { label: "10:30 AM", h: 10, m: 30 },
  { label: "12:00 PM", h: 12, m: 0 },
  { label: "2:00 PM", h: 14, m: 0 },
  { label: "4:00 PM", h: 16, m: 0 },
  { label: "6:00 PM", h: 18, m: 0 },
  { label: "7:30 PM", h: 19, m: 30 },
];

// Date + time picker sheet built from quick-pick chips (works on every
// platform incl. web preview). Returns an ISO string on confirm.
export function ScheduleSheet({
  visible,
  onClose,
  onConfirm,
  submitting,
  title = "Pick date & time",
  confirmLabel = "Confirm",
}: {
  visible: boolean;
  onClose: () => void;
  onConfirm: (iso: string) => void;
  submitting?: boolean;
  title?: string;
  confirmLabel?: string;
}) {
  const styles = useStyles();
  const { colors } = useTheme();
  const [dayIdx, setDayIdx] = useState(0);
  const [slotIdx, setSlotIdx] = useState(3);

  const days = useMemo(
    () => Array.from({ length: 21 }, (_, i) => addDays(new Date(), i)),
    // regenerate when opened
    [visible],
  );

  const handleConfirm = () => {
    const base = days[dayIdx];
    const slot = TIME_SLOTS[slotIdx];
    const dt = setMinutes(setHours(base, slot.h), slot.m);
    onConfirm(dt.toISOString());
  };

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title={title}
      testID="schedule-sheet"
    >
      <Text style={styles.section}>Date</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.dateRow}
      >
        {days.map((d, i) => {
          const active = i === dayIdx;
          const today = isSameDay(d, new Date());
          return (
            <Pressable
              key={i}
              testID={`schedule-day-${i}`}
              onPress={() => setDayIdx(i)}
              style={[styles.dateChip, active && styles.dateChipActive]}
            >
              <Text style={[styles.dateDow, active && styles.dateTextActive]}>
                {today ? "Today" : format(d, "EEE")}
              </Text>
              <Text style={[styles.dateNum, active && styles.dateTextActive]}>
                {format(d, "d")}
              </Text>
              <Text style={[styles.dateMon, active && styles.dateTextActive]}>
                {format(d, "MMM")}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <Text style={[styles.section, { marginTop: spacing.lg }]}>Time</Text>
      <View style={styles.timeGrid}>
        {TIME_SLOTS.map((t, i) => {
          const active = i === slotIdx;
          return (
            <Pressable
              key={t.label}
              testID={`schedule-time-${i}`}
              onPress={() => setSlotIdx(i)}
              style={[styles.timeChip, active && styles.timeChipActive]}
            >
              <Text style={[styles.timeText, active && styles.timeTextActive]}>
                {t.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Button
        testID="schedule-confirm-button"
        label={confirmLabel}
        icon="calendar-check"
        onPress={handleConfirm}
        loading={submitting}
        style={{ marginTop: spacing.xl }}
      />
    </BottomSheet>
  );
}

const useStyles = makeStyles((colors) => ({
  section: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.onSurfaceTertiary,
    marginBottom: spacing.sm,
  },
  dateRow: { gap: spacing.sm, paddingVertical: spacing.xs },
  dateChip: {
    width: 64,
    alignItems: "center",
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceTertiary,
    borderWidth: 1,
    borderColor: colors.border,
    flexShrink: 0,
  },
  dateChipActive: {
    backgroundColor: colors.brandPrimary,
    borderColor: colors.brandPrimary,
  },
  dateDow: { fontSize: 12, color: colors.muted, fontWeight: "600" },
  dateNum: { fontSize: 20, color: colors.onSurface, fontWeight: "800" },
  dateMon: { fontSize: 12, color: colors.muted, fontWeight: "600" },
  dateTextActive: { color: colors.onBrandPrimary },
  timeGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  timeChip: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceTertiary,
    borderWidth: 1,
    borderColor: colors.border,
  },
  timeChipActive: {
    backgroundColor: colors.brandSecondary,
    borderColor: colors.brandPrimary,
  },
  timeText: { fontSize: 14, color: colors.onSurfaceSecondary, fontWeight: "600" },
  timeTextActive: { color: colors.brandPrimary, fontWeight: "800" },
}));
