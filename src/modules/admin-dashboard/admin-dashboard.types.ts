export type DashboardSummaryDto = {
  totalMissions: number;
  activeMissions: number;
  completedMissions: number;
  cancelledMissions: number;
  totalClients: number;
  totalLivreurs: number;
  onlineLivreurs: number;
  unassignedMissions: number;
  totalRevenue: number;
  averagePrice: number;
  completionRate: number;
  cancellationRate: number;
  lastUpdated: string;
};

export type DashboardDailyMissionPointDto = {
  date: string;
  label: string;
  count: number;
};

export type DashboardBreakdownItemDto = {
  key: string;
  label: string;
  count: number;
  percent: number;
  color: string;
};

export type DashboardAddressStructuredDto = {
  label: string | null;
  raw: string | null;
  line1: string | null;
  line2: string | null;
  city: string | null;
  region: string | null;
  postalCode: string | null;
  country: string | null;
  latitude: number | null;
  longitude: number | null;
};

export type DashboardMissionAddressAliasDto = {
  label: string | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
};

export type DashboardMissionDto = {
  id: string;
  adresseRamassage: string | null;
  adresseLivraison: string | null;
  adresseRamassageStructured: DashboardAddressStructuredDto | null;
  adresseLivraisonStructured: DashboardAddressStructuredDto | null;
  depart: string | null;
  destination: string | null;
  departStructured: DashboardMissionAddressAliasDto | null;
  destinationStructured: DashboardMissionAddressAliasDto | null;
  categorie: string | null;
  statut: string | null;
  prix: number | null;
  createdAt: string | null;
  client: Record<string, unknown> | null;
  livreur: Record<string, unknown> | null;
  distanceKm: number | null;
  poidsEstime: number | null;
};

export type DashboardTopLivreurDto = {
  id: string;
  prenom: string | null;
  nom: string | null;
  photo: string | null;
  completedMissions: number;
  totalMissions: number;
  noteMoyenne: number;
  online: boolean;
};

export type DashboardTopClientDto = {
  id: string;
  prenom: string | null;
  nom: string | null;
  photo: string | null;
  createdMissions: number;
  totalSpend: number;
};

export type DashboardOnlineLivreurDto = Record<string, unknown>;

export type DashboardResponseDto = {
  stats: DashboardSummaryDto;
  dailyMissionSeries: DashboardDailyMissionPointDto[];
  statusBreakdown: DashboardBreakdownItemDto[];
  categoryBreakdown: DashboardBreakdownItemDto[];
  recentMissions: DashboardMissionDto[];
  topLivreurs: DashboardTopLivreurDto[];
  topClients: DashboardTopClientDto[];
  unassignedMissions: DashboardMissionDto[];
  onlineLivreurs: DashboardOnlineLivreurDto[];
  lastUpdated: string;
};
