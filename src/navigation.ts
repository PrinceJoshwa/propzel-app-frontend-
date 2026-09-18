import { Platform } from "react-native";

// iOS 26+ gets native liquid-glass tabs; everything else uses the classic JS
// bar. Defined once and imported by the tabs layout and each tab screen.
export const usesNativeTabs =
  Platform.OS === "ios" && parseInt(String(Platform.Version), 10) >= 26;
