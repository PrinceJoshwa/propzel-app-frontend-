import React from "react";
import { Platform } from "react-native";
import { Tabs } from "expo-router";
import Icon from "@react-native-vector-icons/material-design-icons";

import { usesNativeTabs } from "@/src/navigation";
import { useTheme } from "@/src/theme";

export default function TabsLayout() {
  const { colors } = useTheme();

  if (usesNativeTabs) {
    // iOS 26+ liquid glass native tabs.
    const { NativeTabs } = require("expo-router/unstable-native-tabs");
    return (
      <NativeTabs>
        <NativeTabs.Trigger name="index">
          <NativeTabs.Trigger.Icon sf="chart.bar.doc.horizontal" />
          <NativeTabs.Trigger.Label>Home</NativeTabs.Trigger.Label>
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="leads">
          <NativeTabs.Trigger.Icon sf="person.2.fill" />
          <NativeTabs.Trigger.Label>Leads</NativeTabs.Trigger.Label>
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="site-visits">
          <NativeTabs.Trigger.Icon sf="mappin.and.ellipse" />
          <NativeTabs.Trigger.Label>Visits</NativeTabs.Trigger.Label>
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="follow-ups">
          <NativeTabs.Trigger.Icon sf="phone.badge.clock" />
          <NativeTabs.Trigger.Label>Follow-ups</NativeTabs.Trigger.Label>
        </NativeTabs.Trigger>
      </NativeTabs>
    );
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.brandPrimary,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          ...(Platform.OS === "web" ? { height: 64 } : {}),
        },
        tabBarItemStyle: { alignSelf: "center" },
        tabBarLabelStyle: { fontSize: 11, fontWeight: "700" },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Dashboard",
          tabBarIcon: ({ color, size, focused }) => (
            <Icon
              name={focused ? "view-dashboard" : "view-dashboard-outline"}
              size={size}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="leads"
        options={{
          title: "Leads",
          tabBarIcon: ({ color, size, focused }) => (
            <Icon
              name={focused ? "account-group" : "account-group-outline"}
              size={size}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="site-visits"
        options={{
          title: "Visits",
          tabBarIcon: ({ color, size, focused }) => (
            <Icon
              name={focused ? "map-marker-radius" : "map-marker-radius-outline"}
              size={size}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="follow-ups"
        options={{
          title: "Follow-ups",
          tabBarIcon: ({ color, size }) => (
            <Icon name="phone-clock" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
