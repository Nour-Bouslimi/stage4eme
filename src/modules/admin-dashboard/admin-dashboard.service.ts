import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Not, Repository } from 'typeorm';
import { RoleUtilisateur } from '../../common/enums/role-utilisateur.enum';
import { StatutMission } from '../../common/enums/statut-mission.enum';
import { toPublicUser } from '../../common/utils/api-mappers';
import { Mission } from '../missions/entities/mission.entity';
import { Utilisateur } from '../users/entities/user.entity';
import {
  ACTIVE_MISSION_STATUSES,
  CATEGORY_COLORS,
  CATEGORY_LABELS,
  CATEGORY_ORDER,
  COMPLETED_MISSION_STATUSES,
  DASHBOARD_TIME_ZONE,
  STATUS_COLORS,
  STATUS_LABELS,
  STATUS_ORDER,
} from './admin-dashboard.constants';
import {
  DashboardBreakdownItemDto,
  DashboardDailyMissionPointDto,
  DashboardResponseDto,
  DashboardSummaryDto,
  DashboardTopClientDto,
  DashboardTopLivreurDto,
} from './admin-dashboard.types';
import {
  normalizeDashboardCategory,
  normalizeDashboardStatus,
  toDashboardMission,
} from './admin-dashboard.utils';

const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value));

const nowIso = () => new Date().toISOString();

const formatDateKey = (date: Date) => {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: DASHBOARD_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);

  const year = parts.find((part) => part.type === 'year')?.value ?? '1970';
  const month = parts.find((part) => part.type === 'month')?.value ?? '01';
  const day = parts.find((part) => part.type === 'day')?.value ?? '01';
  return `${year}-${month}-${day}`;
};

const formatDateLabel = (date: Date) =>
  new Intl.DateTimeFormat('fr-TN', {
    timeZone: DASHBOARD_TIME_ZONE,
    day: '2-digit',
    month: 'short',
  }).format(date);

@Injectable()
export class AdminDashboardService {
  constructor(
    @InjectRepository(Mission)
    private readonly missionRepository: Repository<Mission>,
    @InjectRepository(Utilisateur)
    private readonly userRepository: Repository<Utilisateur>,
  ) {}

  private parseDays(days?: string | number) {
    const parsed =
      typeof days === 'number' ? days : Number.parseInt(String(days ?? ''), 10);
    if (!Number.isFinite(parsed)) return 30;
    return clamp(parsed, 1, 365);
  }

  private parseLimit(limit?: string | number) {
    const parsed =
      typeof limit === 'number'
        ? limit
        : Number.parseInt(String(limit ?? ''), 10);
    if (!Number.isFinite(parsed)) return 10;
    return clamp(parsed, 1, 50);
  }

  private async getMissionStats(
    lastUpdated: string,
  ): Promise<DashboardSummaryDto> {
    const [missionStats, totalClients, totalLivreurs, onlineLivreurs] =
      await Promise.all([
        this.missionRepository
          .createQueryBuilder('mission')
          .select('COUNT(*)', 'totalMissions')
          .addSelect(
            `COUNT(*) FILTER (WHERE mission.statut IN (:...activeStatuses))`,
            'activeMissions',
          )
          .addSelect(
            `COUNT(*) FILTER (WHERE mission.statut IN (:...completedStatuses))`,
            'completedMissions',
          )
          .addSelect(
            `COUNT(*) FILTER (WHERE mission.statut = :cancelledStatus)`,
            'cancelledMissions',
          )
          .addSelect(
            `COUNT(*) FILTER (WHERE mission."livreurId" IS NULL)`,
            'unassignedMissions',
          )
          .addSelect(
            `COALESCE(SUM(CASE WHEN mission.statut IN (:...completedStatuses) THEN COALESCE(mission."prixEstime", 0) ELSE 0 END), 0)`,
            'totalRevenue',
          )
          .setParameters({
            activeStatuses: ACTIVE_MISSION_STATUSES,
            completedStatuses: COMPLETED_MISSION_STATUSES,
            cancelledStatus: StatutMission.ANNULEE,
          })
          .getRawOne<Record<string, string>>(),
        this.userRepository.count({ where: { role: RoleUtilisateur.CLIENT } }),
        this.userRepository.count({ where: { role: RoleUtilisateur.LIVREUR } }),
        this.userRepository.count({
          where: {
            role: RoleUtilisateur.LIVREUR,
            estActif: true,
            estEnLigne: true,
          },
        }),
      ]);

    const totalMissions = Number(missionStats?.totalMissions ?? 0);
    const completedMissions = Number(missionStats?.completedMissions ?? 0);
    const cancelledMissions = Number(missionStats?.cancelledMissions ?? 0);
    const totalRevenue = Number(missionStats?.totalRevenue ?? 0);

    return {
      totalMissions,
      activeMissions: Number(missionStats?.activeMissions ?? 0),
      completedMissions,
      cancelledMissions,
      totalClients,
      totalLivreurs,
      onlineLivreurs,
      unassignedMissions: Number(missionStats?.unassignedMissions ?? 0),
      totalRevenue: Number(totalRevenue.toFixed(2)),
      averagePrice: Number(
        (completedMissions > 0 ? totalRevenue / completedMissions : 0).toFixed(
          2,
        ),
      ),
      completionRate: Number(
        (totalMissions > 0
          ? (completedMissions / totalMissions) * 100
          : 0
        ).toFixed(2),
      ),
      cancellationRate: Number(
        (totalMissions > 0
          ? (cancelledMissions / totalMissions) * 100
          : 0
        ).toFixed(2),
      ),
      lastUpdated,
    };
  }

  async getSummary(): Promise<DashboardSummaryDto> {
    const lastUpdated = nowIso();
    return this.getMissionStats(lastUpdated);
  }

  async getDailyMissionSeries(
    days?: string | number,
  ): Promise<DashboardDailyMissionPointDto[]> {
    const totalDays = this.parseDays(days);
    const today = new Date();
    const start = new Date(today);
    start.setDate(today.getDate() - (totalDays - 1));
    start.setHours(0, 0, 0, 0);

    const rows = await this.missionRepository
      .createQueryBuilder('mission')
      .select(
        `TO_CHAR(DATE(mission."createdAt" AT TIME ZONE :tz), 'YYYY-MM-DD')`,
        'date',
      )
      .addSelect('COUNT(*)', 'count')
      .where('mission."createdAt" >= :start')
      .groupBy(
        `TO_CHAR(DATE(mission."createdAt" AT TIME ZONE :tz), 'YYYY-MM-DD')`,
      )
      .orderBy('date', 'ASC')
      .setParameters({
        start: start.toISOString(),
        tz: DASHBOARD_TIME_ZONE,
      })
      .getRawMany<{ date: string; count: string }>();

    const counts = new Map<string, number>();
    for (const row of rows) {
      counts.set(row.date, Number(row.count ?? 0));
    }

    const series: DashboardDailyMissionPointDto[] = [];
    for (let index = 0; index < totalDays; index += 1) {
      const date = new Date(start);
      date.setDate(start.getDate() + index);
      const key = formatDateKey(date);
      series.push({
        date: key,
        label: formatDateLabel(date),
        count: counts.get(key) ?? 0,
      });
    }
    return series;
  }

  async getStatusBreakdown(): Promise<DashboardBreakdownItemDto[]> {
    const totalMissions = await this.missionRepository.count();
    const rows = await this.missionRepository
      .createQueryBuilder('mission')
      .select('mission.statut', 'status')
      .addSelect('COUNT(*)', 'count')
      .groupBy('mission.statut')
      .getRawMany<{ status: string; count: string }>();

    const counts = new Map<string, number>();
    for (const row of rows) {
      const normalized = normalizeDashboardStatus(row.status);
      if (!normalized) continue;
      counts.set(
        normalized,
        (counts.get(normalized) ?? 0) + Number(row.count ?? 0),
      );
    }

    return STATUS_ORDER.map((status) => {
      const count = counts.get(status) ?? 0;
      return {
        key: status,
        label: STATUS_LABELS[status] ?? status,
        count,
        percent: Number(
          (totalMissions > 0 ? (count / totalMissions) * 100 : 0).toFixed(2),
        ),
        color: STATUS_COLORS[status] ?? '#64748b',
      };
    });
  }

  async getCategoryBreakdown(): Promise<DashboardBreakdownItemDto[]> {
    const totalMissions = await this.missionRepository.count();
    const rows = await this.missionRepository
      .createQueryBuilder('mission')
      .select('mission.categorie', 'category')
      .addSelect('COUNT(*)', 'count')
      .groupBy('mission.categorie')
      .getRawMany<{ category: string; count: string }>();

    const counts = new Map<string, number>();
    for (const row of rows) {
      const normalized = normalizeDashboardCategory(row.category);
      if (!normalized) continue;
      counts.set(
        normalized,
        (counts.get(normalized) ?? 0) + Number(row.count ?? 0),
      );
    }

    return CATEGORY_ORDER.map((category) => {
      const count = counts.get(category) ?? 0;
      return {
        key: category,
        label: CATEGORY_LABELS[category] ?? category,
        count,
        percent: Number(
          (totalMissions > 0 ? (count / totalMissions) * 100 : 0).toFixed(2),
        ),
        color: CATEGORY_COLORS[category] ?? '#64748b',
      };
    });
  }

  async getRecentMissions(limit?: string | number) {
    const totalLimit = this.parseLimit(limit);
    const missions = await this.missionRepository.find({
      relations: {
        client: true,
        livreur: true,
      },
      order: { createdAt: 'DESC' },
      take: totalLimit,
    });
    return missions.map((mission) => toDashboardMission(mission));
  }

  async getUnassignedMissions(limit?: string | number) {
    const totalLimit = this.parseLimit(limit);
    const missions = await this.missionRepository.find({
      where: { livreurId: IsNull() },
      relations: {
        client: true,
        livreur: true,
      },
      order: { createdAt: 'DESC' },
      take: totalLimit,
    });
    return missions.map((mission) => toDashboardMission(mission));
  }

  async getTopLivreurs(
    limit?: string | number,
  ): Promise<DashboardTopLivreurDto[]> {
    const totalLimit = this.parseLimit(limit);
    const missions = await this.missionRepository.find({
      where: { livreurId: Not(IsNull()) } as any,
      relations: { livreur: true } as any,
      order: { createdAt: 'DESC' },
    });

    const byLivreur = new Map<
      string,
      { user: Utilisateur; totalMissions: number; completedMissions: number }
    >();

    for (const mission of missions) {
      const user = mission.livreur;
      if (!user?.id) continue;
      if (!byLivreur.has(user.id)) {
        byLivreur.set(user.id, {
          user,
          totalMissions: 0,
          completedMissions: 0,
        });
      }
      const bucket = byLivreur.get(user.id);
      if (!bucket) continue;
      bucket.totalMissions += 1;
      if (COMPLETED_MISSION_STATUSES.includes(mission.statut)) {
        bucket.completedMissions += 1;
      }
    }

    return [...byLivreur.values()]
      .filter((bucket) => bucket.completedMissions > 0)
      .sort(
        (left, right) =>
          right.completedMissions - left.completedMissions ||
          right.totalMissions - left.totalMissions,
      )
      .slice(0, totalLimit)
      .map((bucket) => ({
        id: bucket.user.id,
        prenom: bucket.user.prenom ?? null,
        nom: bucket.user.nom ?? null,
        photo: bucket.user.photo ?? null,
        completedMissions: bucket.completedMissions,
        totalMissions: bucket.totalMissions,
        noteMoyenne: Number(bucket.user.noteMoyenne ?? 0),
        online: Boolean(bucket.user.estEnLigne && bucket.user.estActif),
      }));
  }

  async getTopClients(
    limit?: string | number,
  ): Promise<DashboardTopClientDto[]> {
    const totalLimit = this.parseLimit(limit);
    const missions = await this.missionRepository.find({
      where: { clientId: Not(IsNull()) } as any,
      relations: { client: true } as any,
      order: { createdAt: 'DESC' },
    });

    const byClient = new Map<
      string,
      { user: Utilisateur; createdMissions: number; totalSpend: number }
    >();

    for (const mission of missions) {
      const user = mission.client;
      if (!user?.id) continue;
      if (!byClient.has(user.id)) {
        byClient.set(user.id, {
          user,
          createdMissions: 0,
          totalSpend: 0,
        });
      }
      const bucket = byClient.get(user.id);
      if (!bucket) continue;
      bucket.createdMissions += 1;
      bucket.totalSpend += Number(mission.prixEstime ?? 0);
    }

    return [...byClient.values()]
      .sort(
        (left, right) =>
          right.createdMissions - left.createdMissions ||
          right.totalSpend - left.totalSpend,
      )
      .slice(0, totalLimit)
      .map((bucket) => ({
        id: bucket.user.id,
        prenom: bucket.user.prenom ?? null,
        nom: bucket.user.nom ?? null,
        photo: bucket.user.photo ?? null,
        createdMissions: bucket.createdMissions,
        totalSpend: Number(bucket.totalSpend.toFixed(2)),
      }));
  }

  async getOnlineLivreurs(limit?: string | number) {
    const totalLimit = this.parseLimit(limit);
    const users = await this.userRepository.find({
      where: {
        role: RoleUtilisateur.LIVREUR,
        estActif: true,
        estEnLigne: true,
      },
      order: { updatedAt: 'DESC' },
      take: totalLimit,
    });
    return users
      .map((user) => toPublicUser(user))
      .filter(Boolean) as DashboardResponseDto['onlineLivreurs'];
  }

  async getDashboard(
    days?: string | number,
    limit?: string | number,
  ): Promise<DashboardResponseDto> {
    const lastUpdated = nowIso();
    const [
      stats,
      dailyMissionSeries,
      statusBreakdown,
      categoryBreakdown,
      recentMissions,
      topLivreurs,
      topClients,
      unassignedMissions,
      onlineLivreurs,
    ] = await Promise.all([
      this.getMissionStats(lastUpdated),
      this.getDailyMissionSeries(days),
      this.getStatusBreakdown(),
      this.getCategoryBreakdown(),
      this.getRecentMissions(limit),
      this.getTopLivreurs(limit),
      this.getTopClients(limit),
      this.getUnassignedMissions(limit),
      this.getOnlineLivreurs(limit),
    ]);

    return {
      stats,
      dailyMissionSeries,
      statusBreakdown,
      categoryBreakdown,
      recentMissions,
      topLivreurs,
      topClients,
      unassignedMissions,
      onlineLivreurs,
      lastUpdated,
    };
  }
}
