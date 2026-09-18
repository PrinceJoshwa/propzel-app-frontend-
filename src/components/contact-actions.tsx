import React from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import Icon from "@react-native-vector-icons/material-design-icons";
import { useMutation } from "@tanstack/react-query";

import { callingApi } from "@/src/api/crm";
import { useToast } from "@/src/components/toast";
import { callNumber, hasPhone, openWhatsApp } from "@/src/lib/contact";
import { radius, spacing, useTheme } from "@/src/theme";

// Contact actions for a lead/contact:
//  • PRIMARY  = CallerDesk click-to-call (POST /leads/{id}/call) — the backend
//    dials the agent and connects the lead.
//  • SECONDARY = native SIM call (tel:) — retained as a separate button.
//  • WhatsApp quick message.
// Click-to-call needs a leadId; without one only native call + WhatsApp show.
export function ContactActions({
  leadId,
  phone,
  message,
  size = "md",
  labels = false,
}: {
  leadId?: string;
  phone?: string;
  message?: string;
  size?: "sm" | "md";
  labels?: boolean;
}) {
  const { colors } = useTheme();
  const toast = useToast();
  const noPhone = !hasPhone(phone);

  const callMut = useMutation({
    mutationFn: () => callingApi.clickToCall(String(leadId)),
    onSuccess: (res: any) => {
      const status = res?.status;
      if (status === "pending_credentials") {
        toast.show("CallerDesk not configured — call logged", "info");
      } else if (status === "initiated" || status === "queued" || status === "ringing") {
        toast.show("Calling… your phone will ring first", "success");
      } else {
        toast.show(`Call ${String(status || "started").replace(/_/g, " ")}`, "success");
      }
    },
    onError: () => toast.show("Couldn't start click-to-call", "error"),
  });

  const onClickToCall = () => {
    if (!leadId) return;
    callMut.mutate();
  };
  const onNativeCall = async () => {
    const ok = await callNumber(phone);
    if (!ok) toast.show("Can't start a call on this device", "error");
  };
  const onWhatsApp = async () => {
    const ok = await openWhatsApp(phone, message);
    if (!ok) toast.show("WhatsApp isn't available", "error");
  };

  const dim = size === "sm" ? 40 : 46;
  const iconSize = size === "sm" ? 19 : 22;

  // Labeled variant (detail screens): big primary Call + two square buttons.
  if (labels) {
    return (
      <View style={{ gap: spacing.sm }}>
        <Pressable
          testID="contact-clicktocall-button"
          disabled={!leadId || callMut.isPending}
          onPress={onClickToCall}
          style={({ pressed }) => [
            {
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              gap: spacing.sm,
              height: 50,
              borderRadius: radius.md,
              backgroundColor: colors.brandPrimary,
            },
            !leadId && { opacity: 0.4 },
            pressed && { opacity: 0.85 },
          ]}
        >
          {callMut.isPending ? (
            <ActivityIndicator color={colors.onBrandPrimary} size="small" />
          ) : (
            <Icon name="phone-in-talk" size={20} color={colors.onBrandPrimary} />
          )}
          <Text style={{ color: colors.onBrandPrimary, fontWeight: "700", fontSize: 15 }}>
            Click to call
          </Text>
        </Pressable>
        <View style={{ flexDirection: "row", gap: spacing.sm }}>
          <Pressable
            testID="contact-nativecall-button"
            disabled={noPhone}
            onPress={onNativeCall}
            style={({ pressed }) => [
              squareBtn(colors.brandTertiary),
              noPhone && { opacity: 0.4 },
              pressed && { opacity: 0.8 },
            ]}
          >
            <Icon name="sim" size={20} color={colors.brandPrimary} />
            <Text style={{ color: colors.brandPrimary, fontWeight: "700" }}>SIM call</Text>
          </Pressable>
          <Pressable
            testID="contact-whatsapp-button"
            disabled={noPhone}
            onPress={onWhatsApp}
            style={({ pressed }) => [
              squareBtn("#25D3661A"),
              noPhone && { opacity: 0.4 },
              pressed && { opacity: 0.8 },
            ]}
          >
            <Icon name="whatsapp" size={20} color="#128C42" />
            <Text style={{ color: "#128C42", fontWeight: "700" }}>WhatsApp</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  // Compact variant (list rows): three circular buttons.
  return (
    <View style={{ flexDirection: "row", gap: spacing.sm }}>
      {leadId ? (
        <Pressable
          testID="contact-clicktocall-button"
          disabled={callMut.isPending}
          onPress={onClickToCall}
          style={({ pressed }) => [circle(dim, colors.brandPrimary), pressed && { opacity: 0.7 }]}
        >
          {callMut.isPending ? (
            <ActivityIndicator color={colors.onBrandPrimary} size="small" />
          ) : (
            <Icon name="phone-in-talk" size={iconSize} color={colors.onBrandPrimary} />
          )}
        </Pressable>
      ) : null}
      <Pressable
        testID="contact-nativecall-button"
        disabled={noPhone}
        onPress={onNativeCall}
        style={({ pressed }) => [circle(dim, colors.brandTertiary), noPhone && { opacity: 0.4 }, pressed && { opacity: 0.7 }]}
      >
        <Icon name="sim" size={iconSize} color={colors.brandPrimary} />
      </Pressable>
      <Pressable
        testID="contact-whatsapp-button"
        disabled={noPhone}
        onPress={onWhatsApp}
        style={({ pressed }) => [circle(dim, "#25D3661A"), noPhone && { opacity: 0.4 }, pressed && { opacity: 0.7 }]}
      >
        <Icon name="whatsapp" size={iconSize} color="#128C42" />
      </Pressable>
    </View>
  );
}

function circle(dim: number, bg: string) {
  return {
    width: dim,
    height: dim,
    borderRadius: dim / 2,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    backgroundColor: bg,
  };
}

function squareBtn(bg: string) {
  return {
    flex: 1,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    gap: spacing.sm,
    height: 46,
    borderRadius: radius.md,
    backgroundColor: bg,
  };
}
