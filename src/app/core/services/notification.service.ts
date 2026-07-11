import { Injectable } from '@angular/core';
import { Observable, BehaviorSubject, of } from 'rxjs';
import { Notification, isNotificationVisibleToViewer, normalizeNotificationTarget } from '../models/notification.model';
import { AuthService } from './auth.service';
import { UserService } from './user.service';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { io, Socket } from 'socket.io-client';
import { catchError, map, switchMap } from 'rxjs/operators';
import { forkJoin } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private readonly storageKeyPrefix = 'app.notifications.';
  private notificationsSubject = new BehaviorSubject<Notification[]>([]);
  public notifications$ = this.notificationsSubject.asObservable();
  private unreadCountSubject = new BehaviorSubject<number>(0);
  public unreadCount$ = this.unreadCountSubject.asObservable();

  private notifSocket: Socket | null = null;

  constructor(
    private authService: AuthService,
    private userService: UserService,
    private http: HttpClient
  ) {
    this.restoreFromStorage();
    // react to auth state changes: load notifications and connect/disconnect socket
    this.authService.currentUser$.subscribe((user) => {
      if (user) {
        this.loadNotificationsFromBackend();
        this.connectSocket();
      } else {
        this.disconnectSocket();
        // keep local cache - do not clear automatically on logout
      }
    });
  }

  getNotifications(): Observable<Notification[]> {
    return this.notifications$;
  }

  filterVisibleNotifications(notifications: Notification[] | null | undefined): Notification[] {
    const list = Array.isArray(notifications) ? notifications : [];
    return list.filter((notification) => this.shouldKeepNotification(notification));
  }

  loadNotificationsFromBackend(): void {
    if (!this.authService.isLoggedIn()) {
      return;
    }

    this.http.get<unknown[]>(`${environment.apiUrl}/notifications`).subscribe({
      next: (resp) => {
        const rawArray = Array.isArray(resp) ? resp : [];

        // If server explicitly returns an empty array, clear local cache so DB state is authoritative.
        if (rawArray.length === 0) {
          console.debug('[NotificationService] server returned empty notifications array — clearing local cache');
          this.notificationsSubject.next([]);
          this.updateUnreadCount([]);
          this.persist([]);
          return;
        }

        const serverNotifications = this.normalizeNotifications(rawArray);
        const scopedServerNotifications = serverNotifications.filter((notification) => this.shouldKeepNotification(notification));
        if (scopedServerNotifications.length === 0) {
          console.warn('[NotificationService] server returned notifications but none could be normalized — keeping local cache');
          return;
        }

        // dedupe by id using Map, prefer server payload for same id
        const mapById = new Map<string, Notification>();
        // start with server notifications
        for (const n of scopedServerNotifications) {
          mapById.set(n.id, n);
        }
        // then keep local ones that server doesn't have
        for (const local of this.notificationsSubject.value) {
          if (!this.shouldKeepNotification(local)) {
            continue;
          }
          if (!mapById.has(local.id)) {
            mapById.set(local.id, local);
          }
        }

        const merged = Array.from(mapById.values()).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        this.notificationsSubject.next(merged);
        this.updateUnreadCount(merged);
        this.persist(merged);
      },
      error: () => {
        this.restoreFromStorage();
      }
    });
  }

  private connectSocket(): void {
    if (this.notifSocket) {
      return;
    }

    const token = this.authService.getToken();
    const url = environment.socketUrl;
    try {
      this.notifSocket = io(`${url}/notifications`, {
        auth: { token },
        transports: ['websocket']
      });

      this.notifSocket.on('connect_error', (err: any) => console.error('Notification socket connect_error', err));

      // generic notification event
      this.notifSocket.on('notification', (payload: any) => {
        this.handleIncomingPayload(payload);
      });

      // optional specific events -> normalize then handle
      const optionalEvents = ['nouvelle_mission', 'nouveau_message', 'mission_acceptee', 'mission_annulee', 'statut_change', 'mission_terminee', 'livreur_arrive'];
      optionalEvents.forEach((evt) => {
        this.notifSocket!.on(evt, (payload: any) => {
          this.handleIncomingPayload(payload);
        });
      });
    } catch (error) {
      console.error('Unable to connect to notifications socket', error);
      this.notifSocket = null;
    }
  }

  private disconnectSocket(): void {
    if (this.notifSocket) {
      try {
        this.notifSocket.disconnect();
      } catch (e) {
        // ignore
      }
      this.notifSocket = null;
    }
  }

  private handleIncomingPayload(payload: any): void {
    if (!payload) return;

    // if payload contains a notifications array
    if (Array.isArray(payload)) {
      const items = this.normalizeNotifications(payload);
      for (const it of items) {
        this.upsertNotification(it);
      }
      return;
    }

    // If it's an event object, try to map to notification shape
    const normalized = this.normalizeNotifications([payload])[0];
    if (normalized) {
      this.upsertNotification(normalized);
    }
  }

  private upsertNotification(notification: Notification): void {
    const current = this.notificationsSubject.value.slice();

    // Ignore notifications for other users or roles
    if (!this.shouldKeepNotification(notification)) {
      return;
    }

    const contentKey = this.makeContentKey(notification);
    // find by id or by content fingerprint
    let idx = current.findIndex((n) => n.id === notification.id);
    if (idx < 0) {
      idx = current.findIndex((n) => this.makeContentKey(n) === contentKey);
    }

    if (idx >= 0) {
      const existing = current[idx];
      // prefer server id over local id when replacing
      const existingIsLocal = existing.id?.toString().startsWith('local-');
      const incomingIsLocal = notification.id?.toString().startsWith('local-');

      if (existingIsLocal && !incomingIsLocal) {
        // replace local with server notification
        current[idx] = { ...existing, ...notification };
      } else {
        // otherwise merge fields (newer fields overwrite)
        current[idx] = { ...existing, ...notification };
      }
    } else {
      current.unshift(notification);
    }

    // dedupe by id then sort
    const mapById = new Map<string, Notification>();
    for (const n of current) {
      mapById.set(n.id, n);
    }
    const merged = Array.from(mapById.values()).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    this.notificationsSubject.next(merged);
    this.updateUnreadCount(merged);
    this.persist(merged);
  }

  markAsRead(notificationId: string): Observable<Notification> {
    // try backend endpoint first
    const url = `${environment.apiUrl}/notifications/${notificationId}/read`;
    return this.http.patch<unknown>(url, {}).pipe(
      map((resp) => {
        const normalized = this.normalizeNotifications([resp])[0];
        // update local store
        if (normalized) {
          this.upsertNotification(normalized);
          return normalized;
        }

        // fallback to local update
        const updated = this.notificationsSubject.value.map((notification) =>
          notification.id === notificationId ? { ...notification, lu: true, luLe: new Date() } : notification
        );
        this.notificationsSubject.next(updated);
        this.updateUnreadCount(updated);
        this.persist(updated);
        return updated.find((notification) => notification.id === notificationId)!;
      }),
      catchError(() => {
        const updated = this.notificationsSubject.value.map((notification) =>
          notification.id === notificationId ? { ...notification, lu: true, luLe: new Date() } : notification
        );
        this.notificationsSubject.next(updated);
        this.updateUnreadCount(updated);
        this.persist(updated);
        return of(updated.find((notification) => notification.id === notificationId)!);
      })
    );
  }

  markAllAsRead(): Observable<void> {
    const unreadIds = this.notificationsSubject.value.filter(n => !n.lu).map(n => n.id);

    if (unreadIds.length === 0) {
      return of(void 0);
    }

    // attempt backend API to mark multiple as read
    const url = `${environment.apiUrl}/notifications/mark-read`;
    return this.http.patch<unknown>(url, { ids: unreadIds }).pipe(
      switchMap((resp) => {
        const normalized = Array.isArray(resp) ? this.normalizeNotifications(resp as unknown[]) : [];
        if (normalized.length > 0) {
          for (const n of normalized) this.upsertNotification(n);
          return of(void 0);
        }

        // if backend returns no normalized items, fallback to calling single endpoints
        return this.markEachAsRead(unreadIds);
      }),
      catchError(() => {
        // bulk endpoint not implemented or failed — call single mark endpoints
        return this.markEachAsRead(unreadIds);
      })
    );
  }

  private markEachAsRead(ids: string[]): Observable<void> {
    if (!ids.length) return of(void 0);
    const calls = ids.map((id) => this.markAsRead(id).toPromise().catch(() => null));
    // use forkJoin on Observables instead of Promises for consistency
    const obsCalls = ids.map(id => this.markAsRead(id).pipe(catchError(() => of(null))));
    return forkJoin(obsCalls).pipe(map(() => void 0));
  }

  deleteNotification(notificationId: string): Observable<void> {
    const updated = this.notificationsSubject.value.filter((notification) => notification.id !== notificationId);
    this.notificationsSubject.next(updated);
    this.updateUnreadCount(updated);
    this.persist(updated);
    return of(void 0);
  }

  addNotification(notification: {
    type: Notification['type'];
    titre: string;
    message: string;
    missionId?: string;
    id?: string;
    lu?: boolean;
    createdAt?: Date | string;
    userId?: string;
    cibleType?: Notification['cibleType'];
    cibleRole?: Notification['cibleRole'];
    cibleUserId?: string;
    targetRole?: string;
  }): void {
    const currentUser = this.authService.getCurrentUser();
    const resolvedTarget = normalizeNotificationTarget(notification);
    if (!isNotificationVisibleToViewer(resolvedTarget, currentUser)) {
      return;
    }

    const normalizedUserId = resolvedTarget.cibleUserId?.trim() || currentUser?.id || '';

    const normalizedNotification: Notification = {
      // mark local-created notifications with a local- prefix so we can prefer server ids later
      id: notification.id ?? `local-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      userId: normalizedUserId,
      cibleType: resolvedTarget.cibleType,
      cibleRole: resolvedTarget.cibleRole,
      cibleUserId: resolvedTarget.cibleUserId,
      targetRole: resolvedTarget.targetRole,
      type: notification.type,
      titre: notification.titre,
      message: notification.message,
      missionId: notification.missionId,
      lu: notification.lu ?? false,
      createdAt: notification.createdAt ? new Date(notification.createdAt) : new Date()
    };

    const current = this.notificationsSubject.value;
    const alreadyExists = current.some(
      (item) =>
        item.userId === normalizedNotification.userId &&
        item.type === normalizedNotification.type &&
        item.missionId === normalizedNotification.missionId &&
        item.titre === normalizedNotification.titre &&
        item.message === normalizedNotification.message
    );

    if (alreadyExists) {
      return;
    }

    const next = [normalizedNotification, ...current];
    this.notificationsSubject.next(next);
    this.updateUnreadCount(next);
    this.persist(next);
  }

  private makeContentKey(n: Notification): string {
    return `${n.userId}::${n.type}::${n.missionId ?? ''}::${n.titre}::${n.message}`;
  }

  private updateUnreadCount(notifications: Notification[]): void {
    const unreadCount = notifications.filter((notification) => !notification.lu).length;
    this.unreadCountSubject.next(unreadCount);
  }

  private restoreFromStorage(): void {
    const currentUserId = this.getCurrentUserId();

    if (!currentUserId) {
      this.notificationsSubject.next([]);
      this.updateUnreadCount([]);
      return;
    }

    const rawValue = localStorage.getItem(this.getStorageKey(currentUserId));
    if (!rawValue) {
      this.notificationsSubject.next([]);
      this.updateUnreadCount([]);
      return;
    }

    try {
      const parsed = JSON.parse(rawValue) as Notification[];
      const filtered = (Array.isArray(parsed) ? parsed : []).map((notification) => ({
        ...notification,
        createdAt: new Date(notification.createdAt),
        luLe: notification.luLe ? new Date((notification as any).luLe) : undefined
      })).filter((notification) => this.shouldKeepNotification(notification as Notification));

      const deduped = filtered.filter((notification, index, self) =>
        self.findIndex(
          (item) =>
            item.userId === notification.userId &&
            item.type === notification.type &&
            item.missionId === notification.missionId &&
            item.titre === notification.titre &&
            item.message === notification.message
        ) === index
      );

      this.notificationsSubject.next(deduped);
      this.updateUnreadCount(deduped);
    } catch (error) {
      console.warn('Unable to restore notifications from storage', error);
      this.notificationsSubject.next([]);
      this.updateUnreadCount([]);
    }
  }

  private persist(notifications: Notification[]): void {
    const currentUserId = this.getCurrentUserId();
    if (!currentUserId) {
      return;
    }

    localStorage.setItem(this.getStorageKey(currentUserId), JSON.stringify(notifications));
  }

  // Helper to clear local stored notifications for current user
  public clearLocalNotifications(): void {
    const currentUserId = this.getCurrentUserId();
    if (!currentUserId) return;
    localStorage.removeItem(this.getStorageKey(currentUserId));
    this.notificationsSubject.next([]);
    this.updateUnreadCount([]);
  }

  private readStoredNotifications(): Notification[] {
    const currentUserId = this.getCurrentUserId();
    if (!currentUserId) {
      return [];
    }

    const rawValue = localStorage.getItem(this.getStorageKey(currentUserId));
    if (!rawValue) {
      return [];
    }

    try {
      const parsed = JSON.parse(rawValue) as Notification[];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  private matchesCurrentUser(userId: string | undefined, currentUserId: string | null): boolean {
    if (!userId || !currentUserId) {
      return false;
    }

    return userId === currentUserId;
  }

  private createId(): string {
    return `notif-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  private normalizeNotifications(input: unknown[]): Notification[] {
    return input
      .filter((item): item is Partial<Notification> => typeof item === 'object' && item !== null)
      .map((item) => {
        const anyItem = item as any;

        const normalizedTarget = normalizeNotificationTarget({
          id: anyItem.id?.toString(),
          userId:
            anyItem.cibleUserId?.toString() ||
            anyItem.userId?.toString() ||
            anyItem.utilisateurId?.toString() ||
            anyItem.utilisateur?.id?.toString() ||
            '',
          cibleType: anyItem.cibleType?.toString(),
          cibleRole: anyItem.cibleRole?.toString(),
          cibleUserId: anyItem.cibleUserId?.toString(),
          targetRole:
            anyItem.targetRole?.toString() ||
            anyItem.recipientRole?.toString() ||
            anyItem.role?.toString() ||
            anyItem.roleDestinataire?.toString() ||
            anyItem.destinataireRole?.toString() ||
            anyItem.notificationRole?.toString()
        });

        const createdAtValue =
          anyItem.createdAt ??
          anyItem.envoyeeLe ??
          anyItem.envoyeLe ??
          anyItem.lueLe ??
          new Date();

        const messageValue =
          anyItem.message?.toString() ||
          anyItem.corps?.toString() ||
          anyItem.body?.toString() ||
          '';

        const titreValue =
          anyItem.titre?.toString() ||
          anyItem.title?.toString() ||
          anyItem.nom?.toString() ||
          'Notification';

        // missionId may be in different places: missionId, donnees.missionId, donnees.mission.id
        let missionIdVal: string | undefined = undefined;
        if (anyItem.missionId) missionIdVal = anyItem.missionId?.toString();
        else if (anyItem.donnees?.missionId) missionIdVal = anyItem.donnees.missionId?.toString();
        else if (anyItem.donnees?.mission?.id) missionIdVal = anyItem.donnees.mission.id?.toString();
        else if (anyItem.donnees?.missionId) missionIdVal = anyItem.donnees.missionId?.toString();

        const typeVal = (anyItem.type || anyItem.typeNotification || anyItem.notificationType || anyItem.typeNotif) as string | undefined;

        return {
          id: anyItem.id?.toString() ?? this.createId(),
          userId: normalizedTarget.cibleUserId ?? '',
          cibleType: normalizedTarget.cibleType,
          cibleRole: normalizedTarget.cibleRole,
          cibleUserId: normalizedTarget.cibleUserId,
          targetRole: normalizedTarget.targetRole,
          type: typeVal as Notification['type'],
          titre: titreValue,
          message: messageValue,
            missionId: missionIdVal ?? undefined,
            lu: anyItem.lu === true || anyItem.estLue === true || !!anyItem.lueLe,
            luLe: anyItem.lueLe ? new Date(anyItem.lueLe) : undefined,
            createdAt: createdAtValue ? new Date(createdAtValue) : new Date()
        } as Notification;
      })
      // require at least an id and either a userId or a target role
      .filter((item) => !!item.id && (!!item.userId || !!(item as Notification & { targetRole?: string }).targetRole));
  }

  private getCurrentUserId(): string | null {
    return localStorage.getItem('userId');
  }

  private getCurrentRole(): string | null {
    return localStorage.getItem('role');
  }

  private shouldKeepNotification(notification: Notification): boolean {
    return isNotificationVisibleToViewer(notification, this.authService.getCurrentUser());
  }

  private getStorageKey(userId: string): string {
    return `${this.storageKeyPrefix}${userId}`;
  }
}
