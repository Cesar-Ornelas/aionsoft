export type AccessRole = {
  id: string;
  key: string;
  name: string;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type AccessPermission = {
  id: string;
  key: string;
  name: string;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type AccessUser = {
  id: string;
  logtoUserId: string;
  email: string | null;
  displayName: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type PermissionKey = string;

export type CurrentAppUser = {
  id: string;
  logtoUserId: string;
  roleIds: string[];
  permissionKeys: PermissionKey[];
};
