import { Mission } from '../../modules/missions/entities/mission.entity';
import { Message } from '../../modules/chat/entities/message.entity';
import { Notification } from '../../modules/notifications/entities/notification.entity';
import { Utilisateur } from '../../modules/users/entities/user.entity';
import { DisponibiliteLivreur } from '../../modules/users/entities/disponibilite-livreur.entity';
import { StatutDisponibilite } from '../enums/statut-disponibilite.enum';
import { StatutMission } from '../enums/statut-mission.enum';
import { TypeNotification } from '../enums/type-notification.enum';
import { RoleUtilisateur } from '../enums/role-utilisateur.enum';

const DAY_ABBREVIATIONS: Record<string, number> = {
  mon: 1, monday: 1, lun: 1, lundi: 1,
  mar: 2, mardi: 2, tue: 2, tuesday: 2,
  mer: 3, mercredi: 3, wed: 3, wednesday: 3,
  jeu: 4, jeudi: 4, thu: 4, thursday: 4,
  ven: 5, vendredi: 5, fri: 5, friday: 5,
  sam: 6, samedi: 6, sat: 6, saturday: 6,
  dim: 0, dimanche: 0, sun: 0, sunday: 0,
};

const normalizeDayIndex = (value?: string | null) => {
  if (!value) return null;
  const key = value.toString().trim().toLowerCase();
  return DAY_ABBREVIATIONS[key] ?? null;
};

const parseTimeToMinutes = (time?: string | null) => {
  if (!time) return null;
  const match = time.trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (Number.isNaN(hours) || Number.isNaN(minutes) || hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
    return null;
  }
  return hours * 60 + minutes;
};

const getTimeFromDate = (value?: Date | string | null) => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.getHours() * 60 + date.getMinutes();
};

const isSlotAvailableNow = (slot: DisponibiliteLivreur) => {
  if (slot.active === false) return false;
  const currentDate = new Date();
  const currentDayIndex = currentDate.getDay();
  const startDayIndex = normalizeDayIndex(slot.fromDay);
  const endDayIndex = normalizeDayIndex(slot.toDay);

  if (startDayIndex !== null && endDayIndex !== null) {
    if (startDayIndex <= endDayIndex) {
      if (currentDayIndex < startDayIndex || currentDayIndex > endDayIndex) return false;
    } else {
      if (currentDayIndex < startDayIndex && currentDayIndex > endDayIndex) return false;
    }
  } else if (startDayIndex !== null) {
    if (currentDayIndex !== startDayIndex) return false;
  } else if (endDayIndex !== null) {
    if (currentDayIndex !== endDayIndex) return false;
  }

  const startMinutes = parseTimeToMinutes(slot.startTime);
  const endMinutes = parseTimeToMinutes(slot.endTime);
  const currentMinutes = currentDate.getHours() * 60 + currentDate.getMinutes();

  if (startMinutes === null && endMinutes === null) return true;
  if (startMinutes !== null && endMinutes !== null) {
    if (startMinutes <= endMinutes) {
      return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
    }
    return currentMinutes >= startMinutes || currentMinutes <= endMinutes;
  }
  if (startMinutes !== null) return currentMinutes >= startMinutes;
  if (endMinutes !== null) return currentMinutes <= endMinutes;
  return false;
};

export const isUserAvailableNow = (user: Partial<Utilisateur> | null | undefined) => {
  if (!user) return false;
  if (user.role !== 'LIVREUR') return false;
  if (user.estActif === false) return false;
  if (user.estEnLigne !== true) return false;
  if (user.statutDisponibilite !== StatutDisponibilite.DISPONIBLE) return false;

  if (!Array.isArray((user as Utilisateur).disponibilites) || (user as Utilisateur).disponibilites.length === 0) {
    return true;
  }

  return ((user as Utilisateur).disponibilites as DisponibiliteLivreur[]).some(isSlotAvailableNow);
};

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

export type NotificationViewer = {
  userId?: string | null;
  role?: RoleUtilisateur | null;
};

export const isNotificationVisibleToViewer = (
  notification: Partial<Notification>,
  viewer?: NotificationViewer,
) => {
  if (!viewer?.userId) return true;

  const targetType = (notification as any).cibleType ?? null;
  const targetRole = (notification as any).cibleRole ?? null;
  const targetUserId = (notification as any).cibleUtilisateurId ?? null;
  const recipientId = notification.utilisateur?.id ?? (notification as any).userId ?? null;

  if (targetType === 'USER') {
    return targetUserId === viewer.userId || recipientId === viewer.userId;
  }

  if (targetType === 'ROLE') {
    if (!viewer.role) return false;
    return targetRole === viewer.role && recipientId === viewer.userId;
  }

  return recipientId === viewer.userId;
};

export const filterNotificationsForViewer = (
  notifications: Array<Notification | Partial<Notification>> | undefined,
  viewer?: NotificationViewer,
) => (Array.isArray(notifications) ? notifications.filter((notification) => isNotificationVisibleToViewer(notification, viewer)) : []);

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
  fromDay: slot.fromDay ?? null,
  toDay: slot.toDay ?? null,
  active: typeof slot.active === 'boolean' ? slot.active : true,
  startTime: slot.startTime ?? null,
  endTime: slot.endTime ?? null,
  createdAt: toIso(slot.createdAt),
});

export const toPublicUser = (user: Utilisateur | Partial<Utilisateur> | null | undefined) => {
  if (!user) return null;
  const vehicule = mapVehicleFromUser(user);
  const disponibilites = Array.isArray((user as Utilisateur).disponibilites)
    ? ((user as Utilisateur).disponibilites as DisponibiliteLivreur[]).map(mapAvailability)
    : [];

  const available = isUserAvailableNow(user);
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
    mustChangePassword: typeof user.mustChangePassword === 'boolean' ? user.mustChangePassword : false,
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
  mediaUrl: message.urlMedia ?? null,
  imageUrl: message.urlMedia ?? null,
  hasMedia: !!message.urlMedia,
  isImage: String(message.type) === 'IMAGE' || String(message.type) === 'image',
  clientMessageId: (message as any).clientMessageId ?? null,
  auteur: message.auteur ? toPublicUser(message.auteur) : null,
});

export const toNotification = (notification: Notification | Partial<Notification>) => ({
  id: notification.id,
  userId: notification.utilisateur?.id ?? (notification as any).userId ?? null,
  cibleType: (notification as any).cibleType ?? null,
  cibleRole: (notification as any).cibleRole ?? null,
  cibleUserId: (notification as any).cibleUtilisateurId ?? null,
  type: normalizeNotificationType(notification.type),
  titre: notification.titre ?? null,
  message: notification.corps ?? null,
  missionId: notification.mission?.id ?? (notification as any).missionId ?? null,
  lu: !!notification.estLue,
  createdAt: toIso(notification.envoyeeLe),
});

export const toMission = (
  mission: Mission | null | undefined,
  viewer?: NotificationViewer,
) => {
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
    clientId: mission.client?.id ?? (mission as any).clientId ?? null,
    livreurId: mission.livreur?.id ?? (mission as any).livreurId ?? null,
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
    notifications: filterNotificationsForViewer(mission.notifications as any, viewer).map(toNotification),
  };
};
