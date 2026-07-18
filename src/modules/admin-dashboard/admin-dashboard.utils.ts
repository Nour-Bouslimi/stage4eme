import { Mission } from '../missions/entities/mission.entity';
import { Utilisateur } from '../users/entities/user.entity';
import { toIso, toNumber, toPublicUser } from '../../common/utils/api-mappers';
import { CATEGORY_LABELS, STATUS_LABELS } from './admin-dashboard.constants';
import {
  DashboardAddressStructuredDto,
  DashboardMissionAddressAliasDto,
  DashboardMissionDto,
} from './admin-dashboard.types';

const trimOrNull = (value: unknown) => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const capitalize = (value: string) =>
  value
    .split(' ')
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ');

export const normalizeDashboardStatus = (value: unknown) => {
  switch (value) {
    case 'LIVREUR_EN_ROUTE':
      return 'EN_ROUTE';
    case 'ARRIVE_RAMASSAGE':
      return 'ARRIVEE';
    case 'LIVRE':
    case 'LIVREE':
    case 'TERMINEE':
      return 'TERMINEE';
    default:
      return typeof value === 'string' ? value : null;
  }
};

export const normalizeDashboardCategory = (value: unknown) => {
  return typeof value === 'string' ? value : null;
};

export const getDashboardStatusLabel = (status: string | null) => {
  if (!status) return 'Inconnu';
  return (
    STATUS_LABELS[status] ??
    capitalize(status.toLowerCase().replaceAll('_', ' '))
  );
};

export const getDashboardCategoryLabel = (category: string | null) => {
  if (!category) return 'Inconnue';
  return (
    CATEGORY_LABELS[category] ??
    capitalize(category.toLowerCase().replaceAll('_', ' '))
  );
};

export const getMissionAddressStructured = (
  address?: string | null,
  latitude?: unknown,
  longitude?: unknown,
): DashboardAddressStructuredDto | null => {
  const raw = trimOrNull(address);
  if (!raw && latitude === undefined && longitude === undefined) {
    return null;
  }

  const parts = raw
    ? raw
        .split(',')
        .map((part) => part.trim())
        .filter(Boolean)
    : [];
  const line1 = parts[0] ?? raw;
  const line2 =
    parts.length > 2 ? parts.slice(1, -1).join(', ') : (parts[1] ?? null);
  const city = parts.length > 1 ? parts[parts.length - 1] : null;

  return {
    label: raw,
    raw,
    line1,
    line2,
    city,
    region: city,
    postalCode: null,
    country: 'Tunisie',
    latitude: toNumber(latitude),
    longitude: toNumber(longitude),
  };
};

export const getMissionAddressAlias = (
  address?: string | null,
  latitude?: unknown,
  longitude?: unknown,
): DashboardMissionAddressAliasDto | null => {
  const raw = trimOrNull(address);
  if (!raw && latitude === undefined && longitude === undefined) {
    return null;
  }

  return {
    label: raw,
    address: raw,
    latitude: toNumber(latitude),
    longitude: toNumber(longitude),
  };
};

export const toDashboardMission = (mission: Mission): DashboardMissionDto => {
  const publicClient = mission.client ? toPublicUser(mission.client) : null;
  const publicLivreur = mission.livreur ? toPublicUser(mission.livreur) : null;
  const normalizedStatus = normalizeDashboardStatus(mission.statut);

  return {
    id: mission.id,
    adresseRamassage: mission.adresseRamassage ?? null,
    adresseLivraison: mission.adresseLivraison ?? null,
    adresseRamassageStructured: getMissionAddressStructured(
      mission.adresseRamassage,
      mission.latitudeRamassage,
      mission.longitudeRamassage,
    ),
    adresseLivraisonStructured: getMissionAddressStructured(
      mission.adresseLivraison,
      mission.latitudeLivraison,
      mission.longitudeLivraison,
    ),
    depart: mission.adresseRamassage ?? null,
    destination: mission.adresseLivraison ?? null,
    departStructured: getMissionAddressAlias(
      mission.adresseRamassage,
      mission.latitudeRamassage,
      mission.longitudeRamassage,
    ),
    destinationStructured: getMissionAddressAlias(
      mission.adresseLivraison,
      mission.latitudeLivraison,
      mission.longitudeLivraison,
    ),
    categorie: normalizeDashboardCategory(mission.categorie),
    statut: normalizedStatus,
    prix: toNumber(mission.prixEstime),
    createdAt: toIso(mission.createdAt),
    client: publicClient,
    livreur: publicLivreur,
    distanceKm: toNumber(mission.distanceKm),
    poidsEstime: toNumber(mission.poidsEstime),
  };
};

export const toDashboardUser = (user: Utilisateur) => toPublicUser(user);
