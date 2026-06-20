import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';
import { map, tap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { LoginRequest, LoginResponse, SignupRequest, User, UserRole, normalizeUser } from '../models/user.model';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = environment.apiUrl;
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();

  constructor(private http: HttpClient) {
    this.loadUserFromStorage();
  }

  login(credentials: LoginRequest): Observable<LoginResponse> {
    const normalizedCredentials: LoginRequest = {
      email: credentials.email.trim().toLowerCase(),
      motDePasse: credentials.motDePasse
    };

    console.debug('[AuthService] POST /auth/login', {
      email: normalizedCredentials.email,
      motDePasseLength: normalizedCredentials.motDePasse?.length ?? 0
    });

    return this.http.post<unknown>(`${this.apiUrl}/auth/login`, normalizedCredentials).pipe(
      map(response => this.normalizeLoginResponse(response)),
      tap(response => {
        localStorage.setItem('token', response.accessToken);
        localStorage.setItem('role', response.user.role);
        localStorage.setItem('userId', response.user.id);
        this.currentUserSubject.next(normalizeUser(response.user));
      })
    );
  }

  signup(data: SignupRequest): Observable<any> {
    return this.http.post(`${this.apiUrl}/auth/register`, data);
  }

  requestPasswordReset(email: string): Observable<{ message?: string }> {
    return this.http.post<{ message?: string }>(`${this.apiUrl}/auth/forgot-password`, { email });
  }

  validateResetToken(token: string): Observable<unknown> {
    return this.http.get(`${this.apiUrl}/auth/reset-password/validate`, {
      params: { token }
    });
  }

  resetPassword(token: string, motDePasse: string): Observable<{ message?: string }> {
    const payload = {
      token,
      motDePasse
    };

    console.debug('[AuthService] POST /auth/reset-password', {
      tokenPresent: !!payload.token,
      motDePasseLength: payload.motDePasse?.length ?? 0,
      keys: Object.keys(payload)
    });

    return this.http.post<{ message?: string }>(`${this.apiUrl}/auth/reset-password`, payload);
  }

  logout(): void {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    localStorage.removeItem('userId');
    this.currentUserSubject.next(null);
  }

  getToken(): string | null {
    return localStorage.getItem('token');
  }

  getRole(): UserRole | null {
    const role = localStorage.getItem('role');
    return role ? (role as UserRole) : null;
  }

  getUserId(): string | null {
    return localStorage.getItem('userId');
  }

  isLoggedIn(): boolean {
    return !!this.getToken();
  }

  getCurrentUser(): User | null {
    return this.currentUserSubject.value;
  }

  private loadUserFromStorage(): void {
    const userId = localStorage.getItem('userId');
    const role = localStorage.getItem('role');

    if (userId && role) {
      this.currentUserSubject.next(normalizeUser({
        id: userId,
        role: role as UserRole,
        email: '',
        prenom: '',
        nom: '',
        telephone: '',
        photo: '',
        estActif: true,
        noteMoyenne: 0,
        totalNotes: 0,
        totalMissions: 0,
        missionsAnnulees: 0,
        estEnLigne: true,
        disponible: true,
        createdAt: new Date(),
        updatedAt: new Date()
      }));
    }
  }

  private normalizeLoginResponse(response: unknown): LoginResponse {
    if (!response || typeof response !== 'object') {
      throw new Error('Response de connexion invalide');
    }

    const payload = response as Record<string, unknown>;

    const accessToken =
      this.readString(payload, ['accessToken']) ??
      this.readString(payload, ['access_token']) ??
      this.readString(payload, ['token']) ??
      this.readString(payload, ['jwt']) ??
      this.readString(this.readObject(payload, ['data']) ?? {}, ['accessToken', 'access_token', 'token', 'jwt']);

    const userPayload =
      this.readObject(payload, ['user']) ??
      this.readObject(payload, ['utilisateur']) ??
      this.readObject(payload, ['data']) ??
      this.readObject(payload, ['profile']) ??
      this.readObject(payload, ['result']);

    if (!accessToken) {
      const errorMessage = this.readString(payload, ['error', 'message']);
      if (errorMessage) {
        throw new Error(errorMessage);
      }

      console.error('Unexpected login response shape', response);
      throw new Error('Response de connexion invalide');
    }

    const decodedUser = this.decodeJwtUser(accessToken);
    const normalizedUser = normalizeUser({
      ...decodedUser,
      ...(userPayload ?? {})
    } as Partial<User>);

    return {
      accessToken,
      user: normalizedUser
    };
  }

  private decodeJwtUser(token: string): Partial<User> {
    const parts = token.split('.');
    if (parts.length < 2) {
      return {};
    }

    try {
      const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
      const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
      const json = atob(padded);
      const payload = JSON.parse(json) as Record<string, unknown>;

      const role = this.extractRole(payload);
      const id = this.extractString(payload, ['id', 'sub', 'userId', 'user_id']);
      const email = this.extractString(payload, ['email', 'mail']);
      const prenom = this.extractString(payload, ['prenom', 'firstName', 'firstname']) ?? '';
      const nom = this.extractString(payload, ['nom', 'lastName', 'lastname']) ?? '';

      return {
        id,
        email,
        prenom,
        nom,
        role
      };
    } catch (error) {
      console.error('Failed to decode JWT payload', error);
      return {};
    }
  }

  private extractString(source: Record<string, unknown>, keys: string[]): string | undefined {
    for (const key of keys) {
      const value = source[key];
      if (typeof value === 'string' && value.trim()) {
        return value;
      }
    }

    return undefined;
  }

  private extractRole(source: Record<string, unknown>): UserRole | undefined {
    const rawRole = this.extractString(source, ['role', 'roles', 'userRole', 'type']);

    if (!rawRole) {
      return undefined;
    }

    const normalizedRole = rawRole.toUpperCase();
    if (normalizedRole === UserRole.CLIENT || normalizedRole === UserRole.LIVREUR || normalizedRole === UserRole.ADMIN) {
      return normalizedRole as UserRole;
    }

    return undefined;
  }

  private readString(source: Record<string, unknown>, keys: string[]): string | undefined {
    for (const key of keys) {
      const value = source[key];
      if (typeof value === 'string' && value.trim()) {
        return value;
      }
    }

    return undefined;
  }

  private readObject(source: Record<string, unknown>, keys: string[]): Record<string, unknown> | undefined {
    for (const key of keys) {
      const value = source[key];
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        return value as Record<string, unknown>;
      }
    }

    return undefined;
  }
}
