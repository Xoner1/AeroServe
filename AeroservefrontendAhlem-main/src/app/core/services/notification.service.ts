import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Notification } from '../models';
import { WebSocketService } from './websocket.service';

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private apiUrl = environment.apiUrl;
  private unreadCountSubject = new BehaviorSubject<number>(0);
  unreadCount$ = this.unreadCountSubject.asObservable();

  private notificationsSubject = new BehaviorSubject<Notification[]>([]);
  notifications$ = this.notificationsSubject.asObservable();

  constructor(private http: HttpClient, private ws: WebSocketService) {
    this.ws.messages$.subscribe(msg => {
      if (msg.type === 'notification') {
        const n = msg.data as Notification;
        const current = this.notificationsSubject.value;
        this.notificationsSubject.next([n, ...current]);
        this.unreadCountSubject.next(this.unreadCountSubject.value + 1);
      }
      if (msg.type === 'unread_count') {
        this.unreadCountSubject.next(msg.data.count);
      }
    });
  }

  getAll(): Observable<Notification[]> {
    return this.http.get<Notification[]>(`${this.apiUrl}/notifications`);
  }

  getUnreadCount(): Observable<{ unread_count: number }> {
    return this.http.get<{ unread_count: number }>(`${this.apiUrl}/notifications/unread-count`);
  }

  markAsRead(id: number): Observable<any> {
    return this.http.put(`${this.apiUrl}/notifications/${id}/read`, {}).pipe(
      tap(() => {
        const current = this.unreadCountSubject.value;
        if (current > 0) this.unreadCountSubject.next(current - 1);
      })
    );
  }

  markAllAsRead(): Observable<any> {
    return this.http.put(`${this.apiUrl}/notifications/read-all`, {}).pipe(
      tap(() => this.unreadCountSubject.next(0))
    );
  }

  loadUnreadCount(): void {
    this.getUnreadCount().subscribe(res => {
      this.unreadCountSubject.next(res.unread_count);
    });
  }

  connectWebSocket(): void {
    this.ws.connect();
  }

  disconnectWebSocket(): void {
    this.ws.disconnect();
  }
}
