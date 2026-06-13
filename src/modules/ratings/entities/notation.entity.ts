import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, Unique, OneToOne } from 'typeorm';
import { Utilisateur } from '../../users/entities/user.entity';
import { Mission } from '../../missions/entities/mission.entity';

@Entity('notations')
@Unique(['mission'])
export class Notation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'int' })
  etoiles: number;

  @Column({ nullable: true })
  commentaire: string;

  @CreateDateColumn()
  creeLe: Date;

  @ManyToOne(() => Utilisateur, (u) => u.notesDonnees, { eager: true })
  client: Utilisateur;

  @ManyToOne(() => Utilisateur, { eager: true })
  livreur: Utilisateur;

  @ManyToOne(() => Mission, { eager: true })
  mission: Mission;
}
