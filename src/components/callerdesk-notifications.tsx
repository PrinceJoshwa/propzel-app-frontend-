import { useEffect, useRef } from "react";
import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import Constants from "expo-constants";
import { useRouter } from "expo-router";

import { notificationsApi, CrmNotification, followUpsApi, FollowUp } from "@/src/api/crm";
import { useAuth } from "@/src/auth/auth-context";
import { useToast } from "@/src/components/toast";

const CALL_TYPES = new Set(["incoming_call", "call_connected", "missed_call"]);

if (Platform.OS !== "web") {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    }),
  });
}

function leadName(notification: CrmNotification): string {
  const data = notificationData(notification);
  const message = String(notification.message || "");
  const missedMatch = message.match(/^(.+?)\s+did not connect\b/i);
  return String(
    data.lead_name ||
      data.customer_name ||
      data.name ||
      missedMatch?.[1] ||
      message.split(" · ")[0] ||
      "Customer",
  ).trim();
}

function notificationData(value: any): Record<string, any> {
  const direct = value?.data && typeof value.data === "object" ? value.data : {};
  const meta = value?.meta && typeof value.meta === "object" ? value.meta : {};
  const nested = direct.data && typeof direct.data === "object" ? direct.data : {};
  return { ...meta, ...nested, ...direct };
}

function notificationLeadId(value: any): string | undefined {
  const data = notificationData(value);
  const id = data.leadId || data.lead_id || value?.lead_id;
  return id ? String(id) : undefined;
}

function notificationType(value: any): string {
  const data = notificationData(value);
  return String(value?.type || data.type || "");
}

function followUpName(item: FollowUp): string {
  return String((item as any).lead_name || (item as any).customer_name || "Customer");
}

async function configureNotifications() {
  if (Platform.OS === "web") return false;
  const permissions = await Notifications.getPermissionsAsync();
  let status = permissions.status;
  if (status !== "granted") {
    status = (await Notifications.requestPermissionsAsync()).status;
  }
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("callerdesk", {
      name: "Caller Desk",
      importance: Notifications.AndroidImportance.HIGH,
      sound: "default",
    });
  }
  if (status === "granted") {
    try {
      const projectId = Constants.expoConfig?.extra?.eas?.projectId || Constants.easConfig?.projectId;
      const token = (await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : undefined)).data;
      await notificationsApi.registerPushToken(token, Platform.OS);
    } catch {
      // Local reminders and foreground polling still work if push registration fails.
    }
  }
  return status === "granted";
}

async function scheduleFollowUpReminder(item: FollowUp) {
  if (Platform.OS === "web" || !item.id || !item.due_at) return;
  const due = new Date(item.due_at).getTime();
  const reminderAt = Math.max(Date.now() + 5000, due - 5 * 60 * 1000);
  if (reminderAt <= Date.now() || item.status === "done") return;

  const existing = await Notifications.getAllScheduledNotificationsAsync();
  const alreadyScheduled = existing.some(
    (n) => n.content.data && (n.content.data as any).followUpId === String(item.id),
  );
  if (alreadyScheduled) return;

  await Notifications.scheduleNotificationAsync({
    content: {
      title: "Upcoming followup",
      body: `${followUpName(item)} · auto-dialer follow-up`,
      data: { followUpId: String(item.id), leadId: item.lead_id },
      sound: "default",
      ...(Platform.OS === "android" ? { channelId: "callerdesk" } : {}),
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: new Date(reminderAt),
    },
  });
}

export function CallerDeskNotifications() {
  const { user, loading } = useAuth();
  const toast = useToast();
  const router = useRouter();
  const seen = useRef(new Set<string>());
  const configured = useRef(false);

  useEffect(() => {
    if (loading || !user) return;
    let active = true;

    const responseSubscription = Platform.OS !== "web"
      ? Notifications.addNotificationResponseReceivedListener((response) => {
          const content = response.notification.request.content;
          const data = notificationData(content.data);
          const leadId = notificationLeadId(data);
          const link = String(data.link || "");
          if (link.startsWith("/leads/")) router.push(link as any);
          else if (leadId) router.push(`/leads/${leadId}` as any);
        })
      : null;

    const receivedSubscription = Platform.OS !== "web"
      ? Notifications.addNotificationReceivedListener((notification) => {
          const content = notification.request.content;
          const data = notificationData(content.data);
          if (CALL_TYPES.has(notificationType(data))) {
            const name = String(
              data.lead_name ||
                data.customer_name ||
                data.name ||
                content.body?.split(" · ")[0] ||
                "Customer",
            );
            toast.show(`${content.title || "Caller Desk update"}: ${name}`, "info");
          }
        })
      : null;

    const poll = async () => {
      try {
        if (!configured.current) {
          configured.current = await configureNotifications();
        }
        const response = await notificationsApi.list();
        const items = response?.items || [];
        for (const item of items.filter(
          (candidate) => !candidate.read && CALL_TYPES.has(String(candidate.type)),
        )) {
          if (seen.current.has(item.id)) continue;
          seen.current.add(item.id);
          const name = leadName(item);
          toast.show(`${item.title || "Caller Desk update"}: ${name}`, "info");
          if (Platform.OS !== "web" && configured.current) {
            const leadId = notificationLeadId(item);
            await Notifications.scheduleNotificationAsync({
              content: {
                title: `${item.title || "Caller Desk update"}: ${name}`,
                body: item.message || `Call from ${name}`,
                data: { ...notificationData(item), leadId, link: item.link },
                sound: "default",
                ...(Platform.OS === "android" ? { channelId: "callerdesk" } : {}),
              },
              trigger: null,
            });
          }
        }

        if (Platform.OS !== "web" && configured.current && active) {
          const followUps = await followUpsApi.list({ status: "pending" });
          for (const item of followUps || []) {
            if (item.kind === "call") await scheduleFollowUpReminder(item);
          }
        }
      } catch {
        // Notifications are supplementary; a CRM/API outage must not log users out.
      }
    };

    poll();
    const timer = setInterval(poll, 8000);
    return () => {
      active = false;
      clearInterval(timer);
      responseSubscription?.remove();
      receivedSubscription?.remove();
    };
  }, [loading, user, toast, router]);

  return null;
}
