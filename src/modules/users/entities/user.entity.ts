import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { RoleUtilisateur } from '../../../common/enums/role-utilisateur.enum';
import { TypeVehicule } from '../../../common/enums/type-vehicule.enum';
import { StatutDisponibilite } from '../../../common/enums/statut-disponibilite.enum';
import { DisponibiliteLivreur } from './disponibilite-livreur.entity';
import { Mission } from '../../missions/entities/mission.entity';
import { Notation } from '../../ratings/entities/notation.entity';
import { Message } from '../../chat/entities/message.entity';
import { Notification } from '../../notifications/entities/notification.entity';

@Entity('utilisateurs')
export class Utilisateur {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column()
  motDePasseHash: string;

  @Column({ nullable: true })
  prenom: string;

  @Column({ nullable: true })
  nom: string;

  @Column({ nullable: true })
  telephone: string;

  @Column({ nullable: true })
  photo: string;

  @Column({ type: 'enum', enum: RoleUtilisateur, default: RoleUtilisateur.CLIENT })
  role: RoleUtilisateur;

  @Column({ default: true })
  estActif: boolean;

  @Column({ nullable: true })
  cin: string;

  @Column({ nullable: true })
  photoCin: string;

  @Column({ type: 'enum', enum: TypeVehicule, nullable: true })
  typeVehicule: TypeVehicule;

  @Column({ nullable: true })
  immatriculationVehicule: string;

  @Column({ nullable: true })
  photoVehicule: string;

  @Column({ type: 'numeric', nullable: true })
  poidsMaxKg: number;

  @Column({ type: 'numeric', nullable: true })
  volumeMaxM3: number;

  //Zone de couverture
  @Column({ type: 'numeric', nullable: true })
  rayonServiceKm: number;

  @Column({ type: 'enum', enum: StatutDisponibilite, default: StatutDisponibilite.DISPONIBLE })
  statutDisponibilite: StatutDisponibilite;

  @Column({ type: 'numeric', default: 0 })
  noteMoyenne: number;
//Nombre d'évaluations reçues
  @Column({ default: 0 })
  totalNotes: number;

  @Column({ type: 'numeric', nullable: true })
  latitudeActuelle: number;

  @Column({ type: 'numeric', nullable: true })
  longitudeActuelle: number;
//Indique si le livreur est en ligne ou hors ligne
  @Column({ default: true })
  estEnLigne: boolean;

  @Column({ nullable: true })
  adresseParDefaut: string;

  @Column({ default: 0 })
  totalMissions: number;

  @Column({ default: 0 })
  missionsAnnulees: number;

  @Column({ nullable: true })
  derniereActivite: Date;
//Timestamp dernière position
  @Column({ nullable: true })
  derniereMiseAJourPosition: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => DisponibiliteLivreur, (d) => d.livreur)
  disponibilites: DisponibiliteLivreur[];

  @OneToMany(() => Mission, (m) => m.client)
  missionsCreees: Mission[];

  @OneToMany(() => Mission, (m) => m.livreur)
  missionsAcceptees: Mission[];

  @OneToMany(() => Notation, (n) => n.livreur)
  notesDonnees: Notation[];

  @OneToMany(() => Message, (msg) => msg.auteur)
  messages: Message[];

  @OneToMany(() => Notification, (notif) => notif.utilisateur)
  notifications: Notification[];
}
