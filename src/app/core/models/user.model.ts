export enum RoleUtilisateur {
  CLIENT = 'CLIENT',
  LIVREUR = 'LIVREUR',
  ADMIN = 'ADMIN'
}

export enum TypeVehicule {
  BICYCLETTE = 'BICYCLETTE',
  MOTO = 'MOTO',
  SCOOTER = 'SCOOTER',
  VOITURE = 'VOITURE',
  PICKUP = 'PICKUP',
  FOURGONNETTE = 'FOURGONNETTE',
  PETIT_CAMION = 'PETIT_CAMION',
  GROS_CAMION = 'GROS_CAMION'
}

export enum StatutDisponibilite {
  DISPONIBLE = 'DISPONIBLE',
  INDISPONIBLE = 'INDISPONIBLE',
  OCCUPE = 'OCCUPE'
}

export interface VehicleInfo {
  type: TypeVehicule;
  immatriculation: string;
  photo?: string;
  poidsMax: number;
  volumeMax: number;
  rayonService: number;
}

export interface User {
  id: string;
  email: string;
  motDePasseHash?: string;
  prenom: string;
  nom: string;
  telephone: string;
  photo?: string;
  role: RoleUtilisateur;
  estActif: boolean;
  cin?: string;
  photoCin?: string;
  typeVehicule?: TypeVehicule;
  immatriculationVehicule?: string;
  photoVehicule?: string;
  poidsMaxKg?: number;
  volumeMaxM3?: number;
  rayonServiceKm?: number;
  statutDisponibilite?: StatutDisponibilite;
  noteMoyenne?: number;
  totalNotes?: number;
  latitudeActuelle?: number;
  longitudeActuelle?: number;
  estEnLigne?: boolean;
  adresseParDefaut?: string;
  totalMissions?: number;
  missionsAnnulees?: number;
  derniereActivite?: Date | string;
  derniereMiseAJourPosition?: Date | string;
  createdAt: Date | string;
  updatedAt: Date | string;
  disponibilites?: unknown[];
  missionsCreees?: unknown[];
  missionsAcceptees?: unknown[];
  notesDonnees?: unknown[];
  messages?: unknown[];
  notifications?: unknown[];
  avatar?: string;
  disponible?: boolean;
  note?: number;
  nombreAvis?: number;
  vehicule?: VehicleInfo;
}

export interface LoginRequest {
  email: string;
  motDePasse: string;
}

export interface LoginResponse {
  accessToken: string;
  user: User;
}

export interface SignupRequest {
  prenom: string;
  nom: string;
  email: string;
  telephone: string;
  motDePasse: string;
}

const toDate = (value: Date | string | undefined): Date | string | undefined => {
  if (!value) {
    return value;
  }

  return value instanceof Date ? value : new Date(value);
};

export function normalizeUser(user: Partial<User> = {}): User {
  const role = user.role ?? RoleUtilisateur.CLIENT;
  const statutDisponibilite = user.statutDisponibilite;
  const disponible = user.disponible ?? statutDisponibilite === StatutDisponibilite.DISPONIBLE;
  const noteMoyenne = user.noteMoyenne ?? user.note ?? 0;
  const totalNotes = user.totalNotes ?? user.nombreAvis ?? 0;
  const typeVehicule = user.typeVehicule;

  return {
    id: user.id ?? '',
    email: user.email ?? '',
    motDePasseHash: user.motDePasseHash,
    prenom: user.prenom ?? '',
    nom: user.nom ?? '',
    telephone: user.telephone ?? '',
    photo: user.photo ?? user.avatar ?? '',
    role,
    estActif: user.estActif ?? true,
    cin: user.cin,
    photoCin: user.photoCin,
    typeVehicule,
    immatriculationVehicule: user.immatriculationVehicule,
    photoVehicule: user.photoVehicule,
    poidsMaxKg: user.poidsMaxKg,
    volumeMaxM3: user.volumeMaxM3,
    rayonServiceKm: user.rayonServiceKm,
    statutDisponibilite,
    noteMoyenne,
    totalNotes,
    latitudeActuelle: user.latitudeActuelle,
    longitudeActuelle: user.longitudeActuelle,
    estEnLigne: user.estEnLigne ?? disponible,
    adresseParDefaut: user.adresseParDefaut,
    totalMissions: user.totalMissions ?? 0,
    missionsAnnulees: user.missionsAnnulees ?? 0,
    derniereActivite: toDate(user.derniereActivite),
    derniereMiseAJourPosition: toDate(user.derniereMiseAJourPosition),
    createdAt: toDate(user.createdAt) ?? new Date(),
    updatedAt: toDate(user.updatedAt) ?? new Date(),
    disponibilites: user.disponibilites ?? [],
    missionsCreees: user.missionsCreees ?? [],
    missionsAcceptees: user.missionsAcceptees ?? [],
    notesDonnees: user.notesDonnees ?? [],
    messages: user.messages ?? [],
    notifications: [],
    avatar: user.avatar ?? user.photo ?? '',
    disponible,
    note: user.note ?? noteMoyenne,
    nombreAvis: user.nombreAvis ?? totalNotes,
    vehicule: user.vehicule ?? (typeVehicule
      ? {
          type: typeVehicule,
          immatriculation: user.immatriculationVehicule ?? '',
          photo: user.photoVehicule,
          poidsMax: user.poidsMaxKg ?? 0,
          volumeMax: user.volumeMaxM3 ?? 0,
          rayonService: user.rayonServiceKm ?? 0
        }
      : undefined)
  };
}

export { RoleUtilisateur as UserRole };
export { TypeVehicule as VehicleType };
