import { Message } from './message.model';
import { Notification } from './notification.model';
import { User, normalizeUser } from './user.model';

export enum MissionStatus {
  EN_ATTENTE = 'EN_ATTENTE',
  ACCEPTEE = 'ACCEPTEE',
  EN_ROUTE = 'EN_ROUTE',
  ARRIVEE = 'ARRIVEE',
  EN_LIVRAISON = 'EN_LIVRAISON',
  LIVREE = 'LIVREE',
  TERMINEE = 'TERMINEE',
  ANNULEE = 'ANNULEE'
}

export enum MissionCategory {
  COLIS = 'LIVRAISON_COLIS',
  MEUBLES = 'DEMENAGEMENT_MEUBLES',
  DEMENAGEMENT = 'DEMENAGEMENT_COMPLET',
  COURSES = 'LIVRAISON_COURSES',
  MATERIAUX = 'MATERIAUX_CONSTRUCTION',
  PERSONNALISE = 'PERSONNALISE'
}

export interface Address {
  rue: string;
  ville: string;
  codePostal: string;
  pays: string;
  latitude?: number;
  longitude?: number;
}

export interface Notation {
  id?: string;
  [key: string]: unknown;
}

export interface Mission {
  id: string;
  adresseRamassage: string;
  adresseLivraison: string;
  latitudeRamassage?: number | null;
  longitudeRamassage?: number | null;
  latitudeLivraison?: number | null;
  longitudeLivraison?: number | null;
  description?: string | null;
  categorie: MissionCategory;
  typeVehiculeRequis?: string | null;
  poidsEstime?: number | null;
  volumeEstime?: number | null;
  distanceKm?: number | null;
  dureeEstimee?: number | null;
  dateDemandee?: string | null;
  heureDemandee?: string | null;
  statut: MissionStatus;
  accepteeLe?: Date | string | null;
  commenceeLe?: Date | string | null;
  termineeLe?: Date | string | null;
  annuleeLe?: Date | string | null;
  raisonAnnulation?: string | null;
  instructionsSpeciales?: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
  client: User;
  livreur: User | null;
  messages: Message[];
  notation: Notation | null;
  notifications: Notification[];
  clientId?: string;
  livreurId?: string;
  depart: Address;
  destination: Address;
  poids?: number;
  volume?: number;
  dateLivraison: Date | string | null;
  prix?: number;
  prixEstime?: number | null;
  distance?: number;
  vehiculeRequis?: string;
}

export interface CreateMissionRequest {
  adresseRamassage: string;
  adresseLivraison: string;
  categorie: MissionCategory | string;
  poidsEstime: number;
  volumeEstime: number;
  typeVehiculeRequis: string;
  description: string;
  instructionsSpeciales?: string;
  dateDemandee: string;
  heureDemandee: string;
}

export interface UpdateStatusRequest {
  statut: MissionStatus;
}

export interface MissionApiRequest {
  adresseRamassage: string;
  adresseLivraison: string;
  categorie: MissionCategory | string;
  typeVehiculeRequis?: string;
  poidsEstime?: number;
  volumeEstime?: number;
  description?: string;
  dateDemandee?: string;
  heureDemandee?: string;
  instructionsSpeciales?: string;
}

const toDate = (value: Date | string | null | undefined): Date | string | undefined => {
  if (!value) {
    return value ?? undefined;
  }

  return value instanceof Date ? value : new Date(value);
};

const parseAddress = (value: string | undefined): Address | undefined => {
  if (!value) {
    return undefined;
  }

  try {
    const parsed = JSON.parse(value) as Partial<Address>;
    if (parsed && typeof parsed === 'object') {
      return {
        rue: parsed.rue ?? '',
        ville: parsed.ville ?? '',
        codePostal: parsed.codePostal ?? '',
        pays: parsed.pays ?? '',
        latitude: parsed.latitude,
        longitude: parsed.longitude
      };
    }
  } catch {
    // Fallback for plain string addresses returned by the API.
  }

  return {
    rue: value,
    ville: '',
    codePostal: '',
    pays: ''
  };
};

const serializeAddress = (address: Address): string => {
  return JSON.stringify(address);
};

const categoryToDisplay = (value: string | null | undefined): MissionCategory => {
  if (!value) {
    return MissionCategory.COLIS;
  }

  const mapping: Record<string, MissionCategory> = {
    LIVRAISON_COLIS: MissionCategory.COLIS,
    DEMENAGEMENT_MEUBLES: MissionCategory.MEUBLES,
    DEMENAGEMENT_COMPLET: MissionCategory.DEMENAGEMENT,
    LIVRAISON_COURSES: MissionCategory.COURSES,
    MATERIAUX_CONSTRUCTION: MissionCategory.MATERIAUX,
    GROS_OBJETS: MissionCategory.PERSONNALISE,
    PERSONNALISE: MissionCategory.PERSONNALISE
  };

  return mapping[value] ?? MissionCategory.COLIS;
};

const statusToDisplay = (value: string | null | undefined): MissionStatus => {
  if (!value) {
    return MissionStatus.EN_ATTENTE;
  }

  const mapping: Record<string, MissionStatus> = {
    EN_ATTENTE: MissionStatus.EN_ATTENTE,
    ACCEPTEE: MissionStatus.ACCEPTEE,
    EN_ROUTE: MissionStatus.EN_ROUTE,
    ARRIVEE: MissionStatus.ARRIVEE,
    EN_LIVRAISON: MissionStatus.EN_LIVRAISON,
    LIVREE: MissionStatus.LIVREE,
    TERMINEE: MissionStatus.TERMINEE,
    ANNULEE: MissionStatus.ANNULEE
  };

  return mapping[value] ?? MissionStatus.EN_ATTENTE;
};

const categoryToApi = (value: string | null | undefined): string | undefined => {
  if (!value) {
    return undefined;
  }

  const mapping: Record<string, string> = {
    COLIS: 'LIVRAISON_COLIS',
    MEUBLES: 'DEMENAGEMENT_MEUBLES',
    DEMENAGEMENT: 'DEMENAGEMENT_COMPLET',
    COURSES: 'LIVRAISON_COURSES',
    MATERIAUX: 'MATERIAUX_CONSTRUCTION',
    PERSONNALISE: 'PERSONNALISE'
  };

  return mapping[value] ?? value;
};

const vehicleToDisplay = (value: string | null | undefined): string | undefined => {
  if (!value) {
    return undefined;
  }

  const mapping: Record<string, string> = {
    BICYCLETTE: 'Bicyclette',
    MOTO: 'Moto',
    SCOOTER: 'Scooter',
    VOITURE: 'Voiture',
    PICKUP: 'Pickup',
    FOURGONNETTE: 'Camionnette',
    PETIT_CAMION: 'Petit camion',
    GROS_CAMION: 'Gros camion'
  };

  return mapping[value] ?? value;
};

const vehicleToApi = (value: string | null | undefined): string | undefined => {
  if (!value) {
    return undefined;
  }

  const mapping: Record<string, string> = {
    Bicyclette: 'BICYCLETTE',
    Moto: 'MOTO',
    Scooter: 'SCOOTER',
    Voiture: 'VOITURE',
    Pickup: 'PICKUP',
    Camionnette: 'FOURGONNETTE',
    'Petit camion': 'PETIT_CAMION',
    'Gros camion': 'GROS_CAMION'
  };

  return mapping[value] ?? value;
};

const buildMissionDate = (dateDemandee?: string | null, heureDemandee?: string | null): Date | string | undefined => {
  if (!dateDemandee) {
    return undefined;
  }

  if (heureDemandee) {
    const dateTime = new Date(`${dateDemandee}T${heureDemandee}`);
    return Number.isNaN(dateTime.getTime()) ? dateDemandee : dateTime;
  }

  const dateOnly = new Date(dateDemandee);
  return Number.isNaN(dateOnly.getTime()) ? dateDemandee : dateOnly;
};

export function normalizeMission(mission: Partial<Mission> = {}): Mission {
  const emptyAddress: Address = { rue: '', ville: '', codePostal: '', pays: '' };
  const depart = mission.depart ?? parseAddress(mission.adresseRamassage) ?? emptyAddress;
  const destination = mission.destination ?? parseAddress(mission.adresseLivraison) ?? emptyAddress;
  const client = mission.client ? normalizeUser(mission.client) : normalizeUser({ id: mission.clientId });
  const livreur = mission.livreur ? normalizeUser(mission.livreur) : mission.livreurId ? normalizeUser({ id: mission.livreurId }) : undefined;

  return {
    id: mission.id ?? '',
    adresseRamassage: mission.adresseRamassage ?? serializeAddress(depart ?? { rue: '', ville: '', codePostal: '', pays: '' }),
    adresseLivraison: mission.adresseLivraison ?? serializeAddress(destination ?? { rue: '', ville: '', codePostal: '', pays: '' }),
    latitudeRamassage: mission.latitudeRamassage ?? depart?.latitude ?? null,
    longitudeRamassage: mission.longitudeRamassage ?? depart?.longitude ?? null,
    latitudeLivraison: mission.latitudeLivraison ?? destination?.latitude ?? null,
    longitudeLivraison: mission.longitudeLivraison ?? destination?.longitude ?? null,
    description: mission.description ?? null,
    categorie: categoryToDisplay(mission.categorie),
    typeVehiculeRequis: vehicleToDisplay(mission.typeVehiculeRequis ?? mission.vehiculeRequis ?? null) ?? null,
    poidsEstime: mission.poidsEstime ?? mission.poids ?? null,
    volumeEstime: mission.volumeEstime ?? mission.volume ?? null,
    distanceKm: mission.distanceKm ?? mission.distance ?? null,
    dureeEstimee: mission.dureeEstimee ?? null,
    dateDemandee: mission.dateDemandee ?? (typeof mission.dateLivraison === 'string'
      ? mission.dateLivraison.slice(0, 10)
      : mission.dateLivraison instanceof Date
        ? mission.dateLivraison.toISOString().slice(0, 10)
        : null) ?? null,
    heureDemandee: mission.heureDemandee ?? null,
    statut: statusToDisplay(mission.statut),
    accepteeLe: toDate(mission.accepteeLe) ?? null,
    commenceeLe: toDate(mission.commenceeLe) ?? null,
    termineeLe: toDate(mission.termineeLe) ?? null,
    annuleeLe: toDate(mission.annuleeLe) ?? null,
    raisonAnnulation: mission.raisonAnnulation ?? null,
    instructionsSpeciales: mission.instructionsSpeciales ?? null,
    createdAt: toDate(mission.createdAt) ?? new Date(),
    updatedAt: toDate(mission.updatedAt) ?? new Date(),
    client,
    livreur: livreur ?? null,
    messages: mission.messages ?? [],
    notation: mission.notation ?? null,
    notifications: mission.notifications ?? [],
    clientId: mission.clientId ?? client.id,
    livreurId: mission.livreurId ?? livreur?.id,
    depart,
    destination,
    poids: mission.poids ?? mission.poidsEstime ?? undefined,
    volume: mission.volume ?? mission.volumeEstime ?? undefined,
    dateLivraison: mission.dateLivraison ?? buildMissionDate(mission.dateDemandee, mission.heureDemandee) ?? null,
    prix: mission.prix,
    prixEstime: mission.prixEstime ?? mission.prix ?? null,
    distance: mission.distance ?? mission.distanceKm ?? undefined,
    vehiculeRequis: mission.vehiculeRequis ?? mission.typeVehiculeRequis ?? undefined
  };
}

export function toMissionApiRequest(request: CreateMissionRequest): MissionApiRequest {
  return {
    adresseRamassage: request.adresseRamassage,
    adresseLivraison: request.adresseLivraison,
    categorie: categoryToApi(request.categorie) ?? request.categorie,
    typeVehiculeRequis: vehicleToApi(request.typeVehiculeRequis),
    poidsEstime: request.poidsEstime,
    volumeEstime: request.volumeEstime,
    description: request.description,
    instructionsSpeciales: request.instructionsSpeciales,
    dateDemandee: request.dateDemandee,
    heureDemandee: request.heureDemandee
  };
}
