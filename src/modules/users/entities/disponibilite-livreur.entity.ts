import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn } from 'typeorm';
import { Utilisateur } from './user.entity';

// eslint-disable-next-line @typescript-eslint/no-unsafe-call
@Entity('disponibilites_livreur')
export class DisponibiliteLivreur {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ nullable: true })
  day: string;

  @Column({ default: true })
  active: boolean;

  @Column({ nullable: true })
  startTime: string;

  @Column({ nullable: true })
  endTime: string;

  @Column({ type: 'timestamptz', nullable: true })
  heureDebut: Date;

  @Column({ type: 'timestamptz', nullable: true })
  heureFin: Date;

  @Column({ default: false })
  estRecurrent: boolean;

  @Column({ nullable: true })
  regleRecurrence: string;

  @Column({ nullable: true })
  raison: string;

  @CreateDateColumn()
  createdAt: Date;

  @ManyToOne(() => Utilisateur, (u) => u.disponibilites, { onDelete: 'CASCADE' })
  livreur: Utilisateur;
}
