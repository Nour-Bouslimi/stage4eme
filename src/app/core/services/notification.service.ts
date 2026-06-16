import { Injectable } from '@angular/core';
import { Observable, BehaviorSubject, of } from 'rxjs';
import { Notification } from '../models/notification.model';

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private notificationsSubject = new BehaviorSubject<Notification[]>([]);
  public notifications$ = this.notificationsSubject.asObservable();
  private unreadCountSubject = new BehaviorSubject<number>(0);
  public unreadCount$ = this.unreadCountSubject.asObservable();

  constructor() {}

  getNotifications(): Observable<Notification[]> {
    return this.notifications$;
  }

  markAsRead(notificationId: string): Observable<Notification> {
    const updated = this.notificationsSubject.value.map(notification =>
      notification.id === notificationId ? { ...notification, lu: true } : notification
    );
    this.notificationsSubject.next(updated);
    this.updateUnreadCount(updated);
    return of(updated.find(notification => notification.id === notificationId)!);
  }

  markAllAsRead(): Observable<void> {
    const updated = this.notificationsSubject.value.map(notification => ({ ...notification, lu: true }));
    this.notificationsSubject.next(updated);
    this.updateUnreadCount(updated);
    return of(void 0);
  }

  deleteNotification(notificationId: string): Observable<void> {
    const updated = this.notificationsSubject.value.filter(notification => notification.id !== notificationId);
    this.notificationsSubject.next(updated);
    this.updateUnreadCount(updated);
    return of(void 0);
  }

  private updateUnreadCount(notifications: Notification[]): void {
    const unreadCount = notifications.filter(n => !n.lu).length;
    this.unreadCountSubject.next(unreadCount);
  }

  addNotification(notification: Notification): void {
    const current = this.notificationsSubject.value;
    this.notificationsSubject.next([notification, ...current]);
    this.updateUnreadCount([notification, ...current]);
  }
}
