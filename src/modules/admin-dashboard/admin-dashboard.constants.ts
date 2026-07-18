import { CategorieMission } from '../../common/enums/categorie-mission.enum';
import { StatutMission } from '../../common/enums/statut-mission.enum';

export const DASHBOARD_TIME_ZONE = 'Africa/Tunis';

export const ACTIVE_MISSION_STATUSES = [
  StatutMission.ACCEPTEE,
  StatutMission.EN_ROUTE,
  StatutMission.ARRIVEE,
  StatutMission.EN_LIVRAISON,
];

export const COMPLETED_MISSION_STATUSES = [
  StatutMission.LIVREE,
  StatutMission.TERMINEE,
];

export const STATUS_LABELS: Record<string, string> = {
  [StatutMission.EN_ATTENTE]: 'En attente',
  [StatutMission.ACCEPTEE]: 'Acceptée',
  [StatutMission.EN_ROUTE]: 'En route',
  [StatutMission.ARRIVEE]: 'Arrivée',
  [StatutMission.EN_LIVRAISON]: 'En livraison',
  [StatutMission.LIVREE]: 'Terminée',
  [StatutMission.TERMINEE]: 'Terminée',
  [StatutMission.ANNULEE]: 'Annulée',
};

export const STATUS_COLORS: Record<string, string> = {
  [StatutMission.EN_ATTENTE]: '#f59e0b',
  [StatutMission.ACCEPTEE]: '#3b82f6',
  [StatutMission.EN_ROUTE]: '#8b5cf6',
  [StatutMission.ARRIVEE]: '#14b8a6',
  [StatutMission.EN_LIVRAISON]: '#fb923c',
  [StatutMission.LIVREE]: '#22c55e',
  [StatutMission.TERMINEE]: '#22c55e',
  [StatutMission.ANNULEE]: '#ef4444',
};

export const STATUS_ORDER = [
  StatutMission.EN_ATTENTE,
  StatutMission.ACCEPTEE,
  StatutMission.EN_ROUTE,
  StatutMission.ARRIVEE,
  StatutMission.EN_LIVRAISON,
  StatutMission.TERMINEE,
  StatutMission.ANNULEE,
];

export const CATEGORY_LABELS: Record<string, string> = {
  [CategorieMission.LIVRAISON_COLIS]: 'Colis',
  [CategorieMission.DEMENAGEMENT_MEUBLES]: 'Meubles',
  [CategorieMission.DEMENAGEMENT_COMPLET]: 'Déménagement',
  [CategorieMission.LIVRAISON_COURSES]: 'Courses',
  [CategorieMission.MATERIAUX_CONSTRUCTION]: 'Matériaux',
  [CategorieMission.GROS_OBJETS]: 'Gros objets',
  [CategorieMission.PERSONNALISE]: 'Personnalisée',
};

export const CATEGORY_COLORS: Record<string, string> = {
  [CategorieMission.LIVRAISON_COLIS]: '#f97316',
  [CategorieMission.DEMENAGEMENT_MEUBLES]: '#3b82f6',
  [CategorieMission.DEMENAGEMENT_COMPLET]: '#8b5cf6',
  [CategorieMission.LIVRAISON_COURSES]: '#14b8a6',
  [CategorieMission.MATERIAUX_CONSTRUCTION]: '#f59e0b',
  [CategorieMission.GROS_OBJETS]: '#ec4899',
  [CategorieMission.PERSONNALISE]: '#64748b',
};

export const CATEGORY_ORDER = [
  CategorieMission.LIVRAISON_COLIS,
  CategorieMission.DEMENAGEMENT_MEUBLES,
  CategorieMission.DEMENAGEMENT_COMPLET,
  CategorieMission.LIVRAISON_COURSES,
  CategorieMission.MATERIAUX_CONSTRUCTION,
  CategorieMission.GROS_OBJETS,
  CategorieMission.PERSONNALISE,
];
