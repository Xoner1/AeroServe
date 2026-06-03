// NOTE: Requires Laravel Reverb or Pusher to be configured
// and running. Real-time notifications inactive in local dev.
import { Injectable } from '@angular/core';
import { Observable, Subject, BehaviorSubject, timer, Subscription } from 'rxjs';
import { AuthService } from './auth.service';
import { environment } from '../../../environments/environment';

export interface WsMessage {
  type: string;
  data?: any;
}

@Injectable({ providedIn: 'root' })
export class WebSocketService {
  private ws: WebSocket | null = null;
  private messageSubject = new Subject<WsMessage>();
  private connectionStatusSubject = new BehaviorSubject<boolean>(false);
  private reconnectAttempt = 0;
  private maxReconnectDelay = 30000;
  private baseDelay = 1000;
  private shouldReconnect = true;
  private pingInterval: ReturnType<typeof setInterval> | null = null;
  private reconnectSubscription: Subscription | null = null;

  messages$: Observable<WsMessage> = this.messageSubject.asObservable();
  connectionStatus$: Observable<boolean> = this.connectionStatusSubject.asObservable();

  constructor(private auth: AuthService) {}

  connect(): void {
    if (this.ws?.readyState === WebSocket.OPEN) return;
    this.shouldReconnect = true;
    this.doConnect();
  }

  disconnect(): void {
    this.shouldReconnect = false;
    this.reconnectAttempt = 0;
    this.clearPing();
    this.clearReconnectTimer();
    this.ws?.close();
    this.ws = null;
    this.connectionStatusSubject.next(false);
  }

  send(msg: WsMessage): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(msg));
    }
  }

  private doConnect(): void {
    const token = this.auth.getToken();
    const url = `${environment.wsUrl}?token=${token}`;

    this.clearReconnectTimer();
    this.ws = new WebSocket(url);

    this.ws.onopen = () => {
      this.reconnectAttempt = 0;
      this.connectionStatusSubject.next(true);
      this.startPing();
    };

    this.ws.onmessage = (event: MessageEvent) => {
      try {
        const msg: WsMessage = JSON.parse(event.data);
        this.messageSubject.next(msg);
        this.handleMessage(msg);
      } catch {
        this.messageSubject.next({ type: 'raw', data: event.data });
      }
    };

    this.ws.onerror = () => {
      this.connectionStatusSubject.next(false);
    };

    this.ws.onclose = () => {
      this.connectionStatusSubject.next(false);
      this.clearPing();
      this.clearReconnectTimer();
      if (this.shouldReconnect) {
        const delay = Math.min(
          this.baseDelay * Math.pow(2, this.reconnectAttempt),
          this.maxReconnectDelay
        );
        this.reconnectAttempt++;
        this.reconnectSubscription = timer(delay).subscribe(() => {
          if (this.shouldReconnect) {
            this.doConnect();
          }
        });
      }
    };
  }

  private startPing(): void {
    this.clearPing();
    this.pingInterval = setInterval(() => {
      this.send({ type: 'ping' });
    }, 30000);
  }

  private clearPing(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  private clearReconnectTimer(): void {
    if (this.reconnectSubscription) {
      this.reconnectSubscription.unsubscribe();
      this.reconnectSubscription = null;
    }
  }

  private handleMessage(msg: WsMessage): void {
    if (msg.type === 'pong') return;
    if (msg.type === 'notification' && !document.hidden) {
      const n = msg.data;
      if (n && n.title) {
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification(n.title, { body: n.message, icon: '/assets/icon.png' });
        }
      }
    }
  }
}
