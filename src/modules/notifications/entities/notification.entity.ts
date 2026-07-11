import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne } from 'typeorm';
import { TypeNotification } from '../../../common/enums/type-notification.enum';
import { RoleUtilisateur } from '../../../common/enums/role-utilisateur.enum';
import { Utilisateur } from '../../users/entities/user.entity';
import { Mission } from '../../missions/entities/mission.entity';

@Entity('notifications')
export class Notification {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  titre: string;

  @Column({ type: 'text', nullable: true })
  corps: string;

  @Column({ type: 'enum', enum: TypeNotification })
  type: TypeNotification;

  @Column({ default: false })
  estLue: boolean;

  @Column({ type: 'jsonb', nullable: true })
  donnees: any;

  @Column({ type: 'varchar', nullable: true })
  cibleType: 'ROLE' | 'USER' | null;

  @Column({ type: 'enum', enum: RoleUtilisateur, nullable: true })
  cibleRole: RoleUtilisateur | null;

  @Column({ type: 'uuid', nullable: true })
  cibleUtilisateurId: string | null;

  @Column({ type: 'timestamptz', default: () => 'NOW()' })
  envoyeeLe: Date;

  @Column({ type: 'timestamptz', nullable: true })
  lueLe: Date;

  @ManyToOne(() => Utilisateur, (u) => u.notifications, { onDelete: 'CASCADE' })
  utilisateur: Utilisateur;

  @ManyToOne(() => Mission, (m) => m.notifications, { nullable: true })
  mission: Mission;
}
