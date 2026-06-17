import { Mission } from '../../modules/missions/entities/mission.entity';
import { Message } from '../../modules/chat/entities/message.entity';
import { Notification } from '../../modules/notifications/entities/notification.entity';
import { Utilisateur } from '../../modules/users/entities/user.entity';
import { DisponibiliteLivreur } from '../../modules/users/entities/disponibilite-livreur.entity';
import { StatutMission } from '../enums/statut-mission.enum';
import { TypeNotification } from '../enums/type-notification.enum';

export const toIso = (value: unknown) => (value ? new Date(value as string | number | Date).toISOString() : null);

export const toNumber = (value: unknown) => {
  if (value === null || value === undefined || value === '') {
    return null;
  }
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
};

export const normalizeMissionStatus = (value: unknown) => {
  switch (value) {
    case 'LIVREUR_EN_ROUTE':
      return StatutMission.EN_ROUTE;
    case 'ARRIVE_RAMASSAGE':
      return StatutMission.ARRIVEE;
    case 'LIVRE':
      return StatutMission.LIVREE;
    default:
      return value ?? null;
  }
};

export const normalizeNotificationType = (value: unknown) => {
  switch (value) {
    case 'CHANGEMENT_STATUT_MISSION':
      return TypeNotification.STATUT_CHANGE;
    default:
      return value ?? null;
  }
};

export const mapVehicleFromUser = (user: Partial<Utilisateur> | undefined) => ({
  type: user?.typeVehicule ?? null,
  immatriculation: user?.immatriculationVehicule ?? null,
  photo: user?.photoVehicule ?? null,
  poidsMax: toNumber(user?.poidsMaxKg),
  volumeMax: toNumber(user?.volumeMaxM3),
  rayonService: toNumber(user?.rayonServiceKm),
});

export const mapAvailability = (slot: DisponibiliteLivreur) => ({
  id: slot.id,
  day: slot.day ?? null,
  active: typeof slot.active === 'boolean' ? slot.active : true,
  startTime: slot.startTime ?? (slot.heureDebut ? new Date(slot.heureDebut).toISOString().slice(11, 16) : null),
  endTime: slot.endTime ?? (slot.heureFin ? new Date(slot.heureFin).toISOString().slice(11, 16) : null),
  heureDebut: toIso(slot.heureDebut),
  heureFin: toIso(slot.heureFin),
  estRecurrent: slot.estRecurrent ?? false,
  regleRecurrence: slot.regleRecurrence ?? null,
  raison: slot.raison ?? null,
  createdAt: toIso(slot.createdAt),
});

export const toPublicUser = (user: Utilisateur | Partial<Utilisateur> | null | undefined) => {
  if (!user) return null;
  const vehicule = mapVehicleFromUser(user);
  const disponibilites = Array.isArray((user as Utilisateur).disponibilites)
    ? ((user as Utilisateur).disponibilites as DisponibiliteLivreur[]).map(mapAvailability)
    : [];

  const available = user.statutDisponibilite === 'DISPONIBLE';
  return {
    id: user.id,
    email: user.email ?? null,
    prenom: user.prenom ?? null,
    nom: user.nom ?? null,
    telephone: user.telephone ?? null,
    photo: user.photo ?? null,
    avatar: user.photo ?? null,
    role: user.role ?? null,
    estActif: typeof user.estActif === 'boolean' ? user.estActif : true,
    cin: user.cin ?? null,
    photoCin: user.photoCin ?? null,
    typeVehicule: user.typeVehicule ?? null,
    immatriculationVehicule: user.immatriculationVehicule ?? null,
    photoVehicule: user.photoVehicule ?? null,
    poidsMaxKg: toNumber(user.poidsMaxKg),
    volumeMaxM3: toNumber(user.volumeMaxM3),
    rayonServiceKm: toNumber(user.rayonServiceKm),
    statutDisponibilite: user.statutDisponibilite ?? null,
    noteMoyenne: toNumber(user.noteMoyenne) ?? 0,
    totalNotes: toNumber(user.totalNotes) ?? 0,
    latitudeActuelle: toNumber(user.latitudeActuelle),
    longitudeActuelle: toNumber(user.longitudeActuelle),
    estEnLigne: typeof user.estEnLigne === 'boolean' ? user.estEnLigne : false,
    adresseParDefaut: user.adresseParDefaut ?? null,
    totalMissions: toNumber(user.totalMissions) ?? 0,
    missionsAnnulees: toNumber(user.missionsAnnulees) ?? 0,
    derniereActivite: toIso(user.derniereActivite),
    derniereMiseAJourPosition: toIso(user.derniereMiseAJourPosition),
    createdAt: toIso(user.createdAt),
    updatedAt: toIso(user.updatedAt),
    disponibilites,
    missionsCreees: Array.isArray((user as Utilisateur).missionsCreees)
      ? (user as Utilisateur).missionsCreees.map((mission) => toMissionSummary(mission))
      : [],
    missionsAcceptees: Array.isArray((user as Utilisateur).missionsAcceptees)
      ? (user as Utilisateur).missionsAcceptees.map((mission) => toMissionSummary(mission))
      : [],
    notesDonnees: Array.isArray((user as Utilisateur).notesDonnees) ? (user as Utilisateur).notesDonnees : [],
    messages: Array.isArray((user as Utilisateur).messages) ? (user as Utilisateur).messages : [],
    notifications: Array.isArray((user as Utilisateur).notifications) ? (user as Utilisateur).notifications : [],
    disponible: available,
    note: toNumber(user.noteMoyenne) ?? 0,
    nombreAvis: toNumber(user.totalNotes) ?? 0,
    vehicule,
  };
};

export const toMissionSummary = (mission: Mission | Partial<Mission>) => ({
  id: mission.id,
  statut: normalizeMissionStatus(mission.statut),
  adresseRamassage: mission.adresseRamassage ?? null,
  adresseLivraison: mission.adresseLivraison ?? null,
  dateDemandee: mission.dateDemandee ?? null,
  heureDemandee: mission.heureDemandee ?? null,
  distanceKm: toNumber(mission.distanceKm),
  prixEstime: toNumber(mission.prixEstime),
  createdAt: toIso(mission.createdAt),
  updatedAt: toIso(mission.updatedAt),
});

export const toMessage = (message: Message | Partial<Message>) => ({
  id: message.id,
  missionId: message.mission?.id ?? (message as any).missionId ?? null,
  expediteurId: message.auteur?.id ?? (message as any).expediteurId ?? null,
  destinataireId: (message as any).destinataireId ?? null,
  contenu: message.contenu ?? null,
  lu: !!message.estLu,
  dateEnvoi: toIso(message.envoyeLe),
  type: message.type ?? null,
  urlMedia: message.urlMedia ?? null,
  auteur: message.auteur ? toPublicUser(message.auteur) : null,
});

export const toNotification = (notification: Notification | Partial<Notification>) => ({
  id: notification.id,
  userId: notification.utilisateur?.id ?? (notification as any).userId ?? null,
  type: normalizeNotificationType(notification.type),
  titre: notification.titre ?? null,
  message: notification.corps ?? null,
  missionId: notification.mission?.id ?? (notification as any).missionId ?? null,
  lu: !!notification.estLue,
  createdAt: toIso(notification.envoyeeLe),
});

export const toMission = (mission: Mission | null | undefined) => {
  if (!mission) return null;
  return {
    id: mission.id,
    adresseRamassage: mission.adresseRamassage ?? null,
    adresseLivraison: mission.adresseLivraison ?? null,
    latitudeRamassage: toNumber(mission.latitudeRamassage),
    longitudeRamassage: toNumber(mission.longitudeRamassage),
    latitudeLivraison: toNumber(mission.latitudeLivraison),
    longitudeLivraison: toNumber(mission.longitudeLivraison),
    description: mission.description ?? null,
    categorie: mission.categorie ?? null,
    typeVehiculeRequis: mission.typeVehiculeRequis ?? null,
    poidsEstime: toNumber(mission.poidsEstime),
    volumeEstime: toNumber(mission.volumeEstime),
    distanceKm: toNumber(mission.distanceKm),
    dureeEstimee: toNumber(mission.dureeEstimee),
    dateDemandee: mission.dateDemandee ?? null,
    heureDemandee: mission.heureDemandee ?? null,
    statut: normalizeMissionStatus(mission.statut),
    accepteeLe: toIso(mission.accepteeLe),
    commenceeLe: toIso(mission.commenceeLe),
    termineeLe: toIso(mission.termineeLe),
    annuleeLe: toIso(mission.annuleeLe),
    raisonAnnulation: mission.raisonAnnulation ?? null,
    instructionsSpeciales: mission.instructionsSpeciales ?? null,
    createdAt: toIso(mission.createdAt),
    updatedAt: toIso(mission.updatedAt),
    clientId: mission.client?.id ?? null,
    livreurId: mission.livreur?.id ?? null,
    depart: mission.adresseRamassage ?? null,
    destination: mission.adresseLivraison ?? null,
    poids: toNumber(mission.poidsEstime),
    volume: toNumber(mission.volumeEstime),
    dateLivraison: mission.dateDemandee ?? null,
    prix: toNumber(mission.prixEstime),
    prixEstime: toNumber(mission.prixEstime),
    distance: toNumber(mission.distanceKm),
    vehiculeRequis: mission.typeVehiculeRequis ?? null,
    client: mission.client ? toPublicUser(mission.client) : null,
    livreur: mission.livreur ? toPublicUser(mission.livreur) : null,
    messages: Array.isArray(mission.messages) ? mission.messages.map(toMessage) : [],
    notation: mission.notation ?? null,
    notifications: Array.isArray(mission.notifications) ? mission.notifications.map(toNotification) : [],
  };
};
