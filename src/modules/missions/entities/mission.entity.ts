import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  OneToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { CategorieMission } from '../../../common/enums/categorie-mission.enum';
import { TypeVehicule } from '../../../common/enums/type-vehicule.enum';
import { StatutMission } from '../../../common/enums/statut-mission.enum';
import { Utilisateur } from '../../users/entities/user.entity';
import { Message } from '../../chat/entities/message.entity';
import { Notation } from '../../ratings/entities/notation.entity';
import { Notification } from '../../notifications/entities/notification.entity';

@Index('idx_missions_created_at', ['createdAt'])
@Index('idx_missions_status_created_at', ['statut', 'createdAt'])
@Index('idx_missions_category_created_at', ['categorie', 'createdAt'])
@Index('idx_missions_client_created_at', ['clientId', 'createdAt'])
@Index('idx_missions_livreur_created_at', ['livreurId', 'createdAt'])
@Entity('missions')
export class Mission {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  adresseRamassage: string;

  @Column()
  adresseLivraison: string;

  @Column({ type: 'numeric', nullable: true })
  latitudeRamassage: number;

  @Column({ type: 'numeric', nullable: true })
  longitudeRamassage: number;

  @Column({ type: 'numeric', nullable: true })
  latitudeLivraison: number;

  @Column({ type: 'numeric', nullable: true })
  longitudeLivraison: number;

  @Column({ nullable: true })
  description: string;

  @Column({ nullable: true })
  instructionsSpeciales: string;

  @Column({
    type: 'enum',
    enum: CategorieMission,
    default: CategorieMission.LIVRAISON_COLIS,
  })
  categorie: CategorieMission;

  @Column({ type: 'enum', enum: TypeVehicule, nullable: true })
  typeVehiculeRequis: TypeVehicule;

  @Column({ type: 'numeric', nullable: true })
  poidsEstime: number;

  @Column({ type: 'numeric', nullable: true })
  volumeEstime: number;

  @Column({ type: 'numeric', nullable: true })
  distanceKm: number;

  @Column({ nullable: true })
  dureeEstimee: number;

  @Column({ type: 'numeric', nullable: true })
  prixEstime: number;

  @Column({ type: 'date', nullable: true })
  dateDemandee: string;

  @Column({ nullable: true })
  heureDemandee: string;

  @Column({
    type: 'enum',
    enum: StatutMission,
    default: StatutMission.EN_ATTENTE,
  })
  statut: StatutMission;

  @Column({ type: 'timestamptz', nullable: true })
  accepteeLe: Date;

  @Column({ type: 'timestamptz', nullable: true })
  commenceeLe: Date;

  @Column({ type: 'timestamptz', nullable: true })
  termineeLe: Date;

  @Column({ type: 'timestamptz', nullable: true })
  annuleeLe: Date;

  @Column({ nullable: true })
  raisonAnnulation: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ type: 'uuid', nullable: true })
  clientId: string;

  @ManyToOne(() => Utilisateur, (u) => u.missionsCreees, { eager: true })
  @JoinColumn({ name: 'clientId' })
  client: Utilisateur;

  @Column({ type: 'uuid', nullable: true })
  livreurId: string;

  @ManyToOne(() => Utilisateur, (u) => u.missionsAcceptees, {
    nullable: true,
    eager: true,
  })
  @JoinColumn({ name: 'livreurId' })
  livreur: Utilisateur;

  @OneToMany(() => Message, (m) => m.mission)
  messages: Message[];

  @OneToOne(() => Notation, (n) => n.mission, { cascade: true })
  @JoinColumn()
  notation: Notation;

  @OneToMany(() => Notification, (n) => n.mission)
  notifications: Notification[];
}
