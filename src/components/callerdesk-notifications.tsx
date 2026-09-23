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
  return String(
    notification.meta?.lead_name ||
      notification.meta?.customer_name ||
      notification.message?.split(" · ")[0] ||
      "Customer",
  );
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
      const projectId = Constants.expoConfig?.extra?.eas?.projectId;
      const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
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
          const data = response.notification.request.content.data as { leadId?: string };
          if (data?.leadId) router.push(`/leads/${String(data.leadId)}`);
        })
      : null;

    const poll = async () => {
      try {
        if (!configured.current) {
          configured.current = await configureNotifications();
        }
        const response = await notificationsApi.list();
        const items = response?.items || [];
        items
          .filter((item) => !item.read && CALL_TYPES.has(String(item.type)))
          .forEach((item) => {
            if (seen.current.has(item.id)) return;
            seen.current.add(item.id);
            const name = leadName(item);
            toast.show(`${item.title || "Caller Desk update"}: ${name}`, "info");
          });

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
    };
  }, [loading, user, toast, router]);

  return null;
}
