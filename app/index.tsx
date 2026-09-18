import { Redirect } from "expo-router";

import { useAuth } from "@/src/auth/auth-context";
import { LoadingScreen } from "@/src/components/ui";

export default function Index() {
  const { user, loading } = useAuth();
  if (loading) return <LoadingScreen testID="boot-loading" />;
  return <Redirect href={user ? "/(tabs)" : "/login"} />;
}
