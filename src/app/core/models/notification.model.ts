import { UserRole } from './user.model';

export enum NotificationType {
  NOUVELLE_MISSION = 'NOUVELLE_MISSION',
  MISSION_ACCEPTEE = 'MISSION_ACCEPTEE',
  MISSION_ANNULEE = 'MISSION_ANNULEE',
  STATUT_CHANGE = 'STATUT_CHANGE',
  NOUVEAU_MESSAGE = 'NOUVEAU_MESSAGE',
  LIVREUR_ARRIVE = 'LIVREUR_ARRIVE',
  MISSION_TERMINEE = 'MISSION_TERMINEE'
}

export type NotificationCibleType = 'USER' | 'ROLE';

export interface Notification {
  id: string;
  userId: string;
  cibleType?: NotificationCibleType;
  cibleRole?: UserRole;
  cibleUserId?: string;
  targetRole?: string;
  type: NotificationType;
  titre: string;
  message: string;
  missionId?: string;
  lu: boolean;
  luLe?: Date | null;
  createdAt: Date;
}

export interface NotificationViewer {
  id?: string | null;
  role?: UserRole | null;
}

const normalizeRole = (value: unknown): UserRole | undefined => {
  if (typeof value !== 'string') {
    return undefined;
  }

  const normalized = value.trim().toUpperCase();
  if (normalized === UserRole.CLIENT || normalized === UserRole.LIVREUR || normalized === UserRole.ADMIN) {
    return normalized as UserRole;
  }

  return undefined;
};

const normalizeTargetType = (value: unknown): NotificationCibleType | undefined => {
  if (typeof value !== 'string') {
    return undefined;
  }

  const normalized = value.trim().toUpperCase();
  if (normalized === 'USER' || normalized === 'ROLE') {
    return normalized as NotificationCibleType;
  }

  return undefined;
};

const readTrimmedString = (value: unknown): string | undefined => {
  if (typeof value !== 'string') {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
};

export function isNotificationVisibleToViewer(notification: Partial<Notification>, viewer: NotificationViewer | null | undefined): boolean {
  const viewerId = viewer?.id?.trim();
  const viewerRole = viewer?.role?.trim().toUpperCase();

  if (!viewerId || !viewerRole) {
    return false;
  }

  const cibleType = normalizeTargetType(notification.cibleType);
  const cibleUserId = readTrimmedString(notification.cibleUserId) || readTrimmedString(notification.userId);
  const cibleRole = normalizeRole(notification.cibleRole ?? notification.targetRole);

  if (cibleType === 'USER') {
    return !!cibleUserId && cibleUserId === viewerId;
  }

  if (cibleType === 'ROLE') {
    return !!cibleRole && cibleRole === viewerRole;
  }

  if (cibleUserId) {
    if (cibleUserId.startsWith('role:')) {
      const roleFromUserId = normalizeRole(cibleUserId.slice(5));
      return !!roleFromUserId && roleFromUserId === viewerRole;
    }

    return cibleUserId === viewerId;
  }

  if (cibleRole) {
    return cibleRole === viewerRole;
  }

  return false;
}

export function normalizeNotificationTarget(notification: Record<string, unknown> & {
  cibleType?: unknown;
  cibleRole?: unknown;
  cibleUserId?: unknown;
  userId?: unknown;
  targetRole?: unknown;
}): Partial<Notification> {
  const cibleType = normalizeTargetType(notification.cibleType);
  const cibleRole = normalizeRole(notification.cibleRole ?? notification.targetRole);
  const cibleUserId = readTrimmedString(notification.cibleUserId) || readTrimmedString(notification.userId);

  return {
    ...notification,
    cibleType,
    cibleRole,
    cibleUserId,
    targetRole: cibleRole,
    userId: cibleUserId
  };
}
