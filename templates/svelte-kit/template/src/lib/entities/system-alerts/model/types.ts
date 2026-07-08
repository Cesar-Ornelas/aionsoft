export type SystemAlertType = "info" | "success" | "warning" | "error";

export type SystemAlert = {
  id: string;
  title: string;
  message: string;
  type: SystemAlertType;
  startsAt: Date;
  endsAt: Date;
  isActive: boolean;
  createdByUserId: string;
  createdAt: Date;
  updatedAt: Date;
};

export type CreateSystemAlertInput = {
  title: string;
  message: string;
  type?: SystemAlertType;
  startsAt: Date;
  endsAt: Date;
  createdByUserId: string;
};
