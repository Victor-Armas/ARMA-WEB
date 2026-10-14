export type NotificationKind = "success" | "error" | "info" | "loading";

export type NotificationId = string | number;

export interface NotificationOptions {
  id?: NotificationId;
  description?: string;
  duration?: number;
}
