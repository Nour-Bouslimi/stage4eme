import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from 'typeorm';
import { TypeMessage } from '../../../common/enums/type-message.enum';
import { Utilisateur } from '../../users/entities/user.entity';
import { Mission } from '../../missions/entities/mission.entity';

@Entity('messages')
export class Message {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'text', nullable: true })
  contenu: string;

  @Column({ type: 'enum', enum: TypeMessage, default: TypeMessage.TEXTE })
  type: TypeMessage;

  @Column({ default: false })
  estLu: boolean;

  @Column({ type: 'timestamptz', nullable: true })
  luLe: Date;

  @Column({ nullable: true })
  urlMedia: string;

  @Column({ type: 'timestamptz', default: () => 'NOW()' })
  envoyeLe: Date;

  @ManyToOne(() => Utilisateur, (u) => u.messages, { eager: true })
  auteur: Utilisateur;

  @ManyToOne(() => Mission, (m) => m.messages, { onDelete: 'CASCADE' })
  mission: Mission;
}
