export type SettingsHealth = {
  status: "connected" | "unavailable";
  hasBrandName: boolean;
  reason: string;
};
