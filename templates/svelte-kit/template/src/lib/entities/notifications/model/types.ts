export type NotificationScope = "global" | "user";

export type NotificationType = "info" | "success" | "warning" | "error";

export type AppNotification = {
  id: string;
  recipientScope: NotificationScope;
  recipientUserId: string | null;
  type: NotificationType;
  title: string;
  message: string;
  actionHref: string | null;
  readAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type PublishNotificationInput = {
  recipientScope?: NotificationScope;
  recipientUserId?: string | null;
  type?: NotificationType;
  title: string;
  message: string;
  actionHref?: string | null;
};
