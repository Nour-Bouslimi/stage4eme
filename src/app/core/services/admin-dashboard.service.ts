import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, catchError, map, of } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Mission, MissionCategory, MissionStatus, normalizeMission } from '../models/mission.model';
import { User, normalizeUser } from '../models/user.model';

export interface DashboardStatsResponse {
  totalMissions?: number;
  activeMissions?: number;
  completedMissions?: number;
  cancelledMissions?: number;
  totalClients?: number;
  totalLivreurs?: number;
  onlineLivreurs?: number;
  unassignedMissions?: number;
  totalRevenue?: number;
  averagePrice?: number;
  completionRate?: number;
  cancellationRate?: number;
  lastUpdated?: string | Date | null;
}

export interface DailyMissionPointResponse {
  date?: string | Date;
  label?: string;
  count?: number;
  percent?: number;
}

export interface BreakdownPointResponse {
  label?: string;
  count?: number;
  percent?: number;
  color?: string;
  value?: string;
}

export interface TopParticipantResponse {
  id?: string;
  user?: User;
  name?: string;
  prenom?: string;
  nom?: string;
  avatar?: string;
  photo?: string;
  email?: string;
  totalMissions?: number;
  missionsCount?: number;
  completedMissions?: number;
  createdMissions?: number;
  revenue?: number;
  score?: number;
  noteMoyenne?: number;
  note?: number;
  online?: boolean;
}

export interface AdminDashboardResponse {
  stats?: DashboardStatsResponse;
  dailyMissionSeries?: DailyMissionPointResponse[];
  statusBreakdown?: BreakdownPointResponse[];
  categoryBreakdown?: BreakdownPointResponse[];
  recentMissions?: Mission[];
  topLivreurs?: TopParticipantResponse[];
  topClients?: TopParticipantResponse[];
  unassignedMissions?: Mission[];
  onlineLivreurs?: User[];
  lastUpdated?: string | Date | null;
}

export interface DashboardBarPoint {
  label: string;
  count: number;
  percent: number;
  date?: Date;
}

export interface DashboardBreakdownPoint {
  label: string;
  count: number;
  percent: number;
  color: string;
}

export interface DashboardTopParticipant {
  id: string;
  name: string;
  avatar: string;
  email: string;
  count: number;
  score?: number;
}

export interface AdminDashboardData {
  stats: DashboardStatsResponse;
  dailyMissionSeries: DashboardBarPoint[];
  statusBreakdown: DashboardBreakdownPoint[];
  categoryBreakdown: DashboardBreakdownPoint[];
  recentMissions: Mission[];
  topLivreurs: DashboardTopParticipant[];
  topClients: DashboardTopParticipant[];
  unassignedMissions: Mission[];
  onlineLivreurs: User[];
  lastUpdated: Date | null;
}

@Injectable({
  providedIn: 'root'
})
export class AdminDashboardService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  getDashboard(days = 30, limit = 6): Observable<AdminDashboardData> {
    const params = new HttpParams()
      .set('days', String(days))
      .set('limit', String(limit));

    return this.http.get<AdminDashboardResponse>(`${this.apiUrl}/admin/dashboard`, { params }).pipe(
      map((response) => this.normalizeDashboard(response)),
      catchError(() => of(this.getEmptyDashboard()))
    );
  }

  getSummary(): Observable<DashboardStatsResponse> {
    return this.http.get<DashboardStatsResponse>(`${this.apiUrl}/admin/dashboard/summary`).pipe(
      catchError(() => of({}))
    );
  }

  getDailyMissionSeries(days = 30): Observable<DashboardBarPoint[]> {
    const params = new HttpParams().set('days', String(days));
    return this.http.get<DailyMissionPointResponse[]>(`${this.apiUrl}/admin/dashboard/daily-missions`, { params }).pipe(
      map((points) => (points || []).map((point) => this.normalizeDailyPoint(point))),
      catchError(() => of([]))
    );
  }

  getStatusBreakdown(): Observable<DashboardBreakdownPoint[]> {
    return this.http.get<BreakdownPointResponse[]>(`${this.apiUrl}/admin/dashboard/status-breakdown`).pipe(
      map((points) => (points || []).map((point) => this.normalizeBreakdownPoint(point, this.getDefaultStatusColor(point?.value || point?.label || '')))),
      catchError(() => of([]))
    );
  }

  getCategoryBreakdown(): Observable<DashboardBreakdownPoint[]> {
    return this.http.get<BreakdownPointResponse[]>(`${this.apiUrl}/admin/dashboard/category-breakdown`).pipe(
      map((points) => (points || []).map((point) => this.normalizeBreakdownPoint(point, this.getDefaultCategoryColor(point?.value || point?.label || '')))),
      catchError(() => of([]))
    );
  }

  getRecentMissions(limit = 6): Observable<Mission[]> {
    const params = new HttpParams().set('limit', String(limit));
    return this.http.get<Mission[]>(`${this.apiUrl}/admin/dashboard/recent-missions`, { params }).pipe(
      map((missions) => (missions || []).map((mission) => normalizeMission(mission))),
      catchError(() => of([]))
    );
  }

  getTopLivreurs(limit = 5): Observable<DashboardTopParticipant[]> {
    const params = new HttpParams().set('limit', String(limit));
    return this.http.get<TopParticipantResponse[]>(`${this.apiUrl}/admin/dashboard/top-livreurs`, { params }).pipe(
      map((items) => (items || []).map((item) => this.normalizeTopParticipant(item))),
      catchError(() => of([]))
    );
  }

  getTopClients(limit = 5): Observable<DashboardTopParticipant[]> {
    const params = new HttpParams().set('limit', String(limit));
    return this.http.get<TopParticipantResponse[]>(`${this.apiUrl}/admin/dashboard/top-clients`, { params }).pipe(
      map((items) => (items || []).map((item) => this.normalizeTopParticipant(item))),
      catchError(() => of([]))
    );
  }

  getUnassignedMissions(limit = 6): Observable<Mission[]> {
    const params = new HttpParams().set('limit', String(limit));
    return this.http.get<Mission[]>(`${this.apiUrl}/admin/dashboard/unassigned-missions`, { params }).pipe(
      map((missions) => (missions || []).map((mission) => normalizeMission(mission))),
      catchError(() => of([]))
    );
  }

  getOnlineLivreurs(limit = 6): Observable<User[]> {
    const params = new HttpParams().set('limit', String(limit));
    return this.http.get<User[]>(`${this.apiUrl}/admin/dashboard/online-livreurs`, { params }).pipe(
      map((users) => (users || []).map((user) => normalizeUser(user))),
      catchError(() => of([]))
    );
  }

  private normalizeDashboard(response: AdminDashboardResponse): AdminDashboardData {
    const stats = response?.stats ?? {};

    return {
      stats,
      dailyMissionSeries: (response?.dailyMissionSeries || []).map((point) => this.normalizeDailyPoint(point)),
      statusBreakdown: (response?.statusBreakdown || []).map((point) => this.normalizeBreakdownPoint(point, this.getDefaultStatusColor(point?.value || point?.label || ''))),
      categoryBreakdown: (response?.categoryBreakdown || []).map((point) => this.normalizeBreakdownPoint(point, this.getDefaultCategoryColor(point?.value || point?.label || ''))),
      recentMissions: (response?.recentMissions || []).map((mission) => normalizeMission(mission)),
      topLivreurs: (response?.topLivreurs || []).map((item) => this.normalizeTopParticipant(item)),
      topClients: (response?.topClients || []).map((item) => this.normalizeTopParticipant(item)),
      unassignedMissions: (response?.unassignedMissions || []).map((mission) => normalizeMission(mission)),
      onlineLivreurs: (response?.onlineLivreurs || []).map((user) => normalizeUser(user)),
      lastUpdated: this.parseDate(response?.lastUpdated)
    };
  }

  private normalizeDailyPoint(point: DailyMissionPointResponse): DashboardBarPoint {
    const date = this.parseDate(point?.date);
    return {
      label: point?.label || this.formatDayLabel(date),
      count: Number(point?.count ?? 0),
      percent: Number(point?.percent ?? 0),
      date: date ?? undefined
    };
  }

  private normalizeBreakdownPoint(point: BreakdownPointResponse, fallbackColor: string): DashboardBreakdownPoint {
    return {
      label: point?.label || '',
      count: Number(point?.count ?? 0),
      percent: Number(point?.percent ?? 0),
      color: point?.color || fallbackColor
    };
  }

  private normalizeTopParticipant(item: TopParticipantResponse): DashboardTopParticipant {
    const user = item?.user ? normalizeUser(item.user) : null;
    const name = item?.name || item?.prenom || item?.email || `${user?.prenom || ''} ${user?.nom || ''}`.trim() || 'Utilisateur';

    return {
      id: item?.id || user?.id || item?.email || name,
      name,
      avatar: item?.avatar || item?.photo || user?.avatar || user?.photo || 'assets/default-avatar.svg',
      email: item?.email || user?.email || '',
      count: Number(item?.totalMissions ?? item?.missionsCount ?? item?.createdMissions ?? item?.completedMissions ?? 0),
      score: item?.score ?? item?.noteMoyenne ?? item?.note
    };
  }

  private getDefaultStatusColor(label: string): string {
    const normalized = label.toLowerCase();
    if (normalized.includes('attente')) return '#f59e0b';
    if (normalized.includes('accept')) return '#3b82f6';
    if (normalized.includes('route')) return '#8b5cf6';
    if (normalized.includes('livraison')) return '#fb923c';
    if (normalized.includes('termin')) return '#22c55e';
    if (normalized.includes('annul')) return '#ef4444';
    return '#64748b';
  }

  private getDefaultCategoryColor(label: string): string {
    const normalized = label.toLowerCase();
    if (normalized.includes('colis')) return '#ff6b2c';
    if (normalized.includes('meuble')) return '#3b82f6';
    if (normalized.includes('dém') || normalized.includes('dem')) return '#8b5cf6';
    if (normalized.includes('course')) return '#14b8a6';
    if (normalized.includes('mat')) return '#f59e0b';
    return '#ec4899';
  }

  private parseDate(value: string | Date | null | undefined): Date | null {
    if (!value) {
      return null;
    }

    const date = value instanceof Date ? value : new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  private formatDayLabel(date: Date | null): string {
    if (!date) {
      return '';
    }

    return new Intl.DateTimeFormat('fr-FR', {
      day: '2-digit',
      month: 'short'
    }).format(date);
  }

  private getEmptyDashboard(): AdminDashboardData {
    return {
      stats: {},
      dailyMissionSeries: [],
      statusBreakdown: [],
      categoryBreakdown: [],
      recentMissions: [],
      topLivreurs: [],
      topClients: [],
      unassignedMissions: [],
      onlineLivreurs: [],
      lastUpdated: null
    };
  }
}
