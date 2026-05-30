import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { BehaviorSubject, Observable, tap, map, catchError } from 'rxjs';
import { Router } from '@angular/router';
import { AuthResponse, User } from '../models';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private apiUrl = environment.apiUrl;
  private currentUserSubject = new BehaviorSubject<User | null>(this.getStoredUser());
  currentUser$ = this.currentUserSubject.asObservable();

  constructor(private http: HttpClient, private router: Router) {}

  login(email: string, password: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/login`, { email, password }).pipe(
      tap(res => {
        localStorage.setItem('token', res.access_token);
        localStorage.setItem('user', JSON.stringify(res.user));
        this.currentUserSubject.next(res.user);
      })
    );
  }
  forgotPassword(email: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/forgot-password`, { email });
  }
  resetPasswordWithToken(data: any) {
    return this.http.post(`${this.apiUrl}/password/reset`, data);
  }
  logout(): void {
    const token = this.getToken();
    if (token) {
      this.http.post(`${this.apiUrl}/logout`, {}).subscribe({ error: () => {} });
    }
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    this.currentUserSubject.next(null);
    this.router.navigate(['/login']);
  }

  getToken(): string | null {
    return localStorage.getItem('token');
  }

 isLoggedIn(): boolean {
  const token = this.getToken();
  const user = this.getStoredUser();

  if (!token || !user) return false;

  const parts = token.split('.');
  if (parts.length !== 3) {
    return false;
  }

  try {
    const payload = JSON.parse(atob(parts[1]));
    const exp = payload.exp * 1000;

    if (Date.now() > exp) {
      this.logout();
      return false;
    }

    return true;
  } catch (e) {
    return false;
  }
}
canAccessLogin(): boolean {
  return !this.isLoggedIn();
}
  getCurrentUser(): User | null {
    return this.currentUserSubject.value;
  }

  getUserRole(): string {
    return this.currentUserSubject.value?.role?.name || '';
  }

  hasRole(...roles: string[]): boolean {
    const userRole = this.getUserRole();
    return roles.includes(userRole);
  }

  getProfile(): Observable<User> {
    return this.http.get<any>(`${this.apiUrl}/me`).pipe(
      map(res => res.user || res)
    );
  }

  updateProfile(data: FormData): Observable<any> {
    // PHP can't parse multipart/form-data on PUT — use POST with method spoofing
    data.append('_method', 'PUT');
    return this.http.post(`${this.apiUrl}/profile`, data);
  }

  setCurrentUser(user: User): void {
    this.currentUserSubject.next(user);
    localStorage.setItem('user', JSON.stringify(user));
  }
  private getStoredUser(): User | null {
    const stored = localStorage.getItem('user');
    return stored ? JSON.parse(stored) : null;
  }
}
