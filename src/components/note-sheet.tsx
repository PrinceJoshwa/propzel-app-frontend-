import React, { useState } from "react";
import { Text, TextInput, View } from "react-native";

import { BottomSheet } from "@/src/components/sheet";
import { Button } from "@/src/components/ui";
import { makeStyles, radius, spacing, useTheme } from "@/src/theme";

// Add-note bottom sheet with a single multiline input.
export function NoteSheet({
  visible,
  onClose,
  onSubmit,
  submitting,
  title = "Add note",
}: {
  visible: boolean;
  onClose: () => void;
  onSubmit: (text: string) => void;
  submitting?: boolean;
  title?: string;
}) {
  const [text, setText] = useState("");
  const styles = useStyles();
  const { colors } = useTheme();

  const handleClose = () => {
    setText("");
    onClose();
  };
  const handleSubmit = () => {
    const t = text.trim();
    if (!t) return;
    onSubmit(t);
    setText("");
  };

  return (
    <BottomSheet visible={visible} onClose={handleClose} title={title} testID="note-sheet">
      <TextInput
        testID="note-input"
        value={text}
        onChangeText={setText}
        placeholder="Type your note…"
        placeholderTextColor={colors.muted}
        multiline
        autoFocus
        style={styles.input}
      />
      <Button
        testID="note-submit-button"
        label="Save note"
        icon="content-save-outline"
        onPress={handleSubmit}
        loading={submitting}
        disabled={!text.trim()}
        style={{ marginTop: spacing.lg }}
      />
      <Text style={styles.hint}>
        Notes are logged to the activity history for this record.
      </Text>
    </BottomSheet>
  );
}

const useStyles = makeStyles((colors) => ({
  input: {
    minHeight: 120,
    maxHeight: 220,
    backgroundColor: colors.surfaceTertiary,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    fontSize: 15,
    color: colors.onSurface,
    textAlignVertical: "top",
  },
  hint: {
    marginTop: spacing.md,
    fontSize: 12,
    color: colors.muted,
    textAlign: "center",
  },
}));
