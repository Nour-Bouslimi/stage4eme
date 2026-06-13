import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn } from 'typeorm';
import { Utilisateur } from './user.entity';

// eslint-disable-next-line @typescript-eslint/no-unsafe-call
@Entity('disponibilites_livreur')
export class DisponibiliteLivreur {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'timestamptz' })
  heureDebut: Date;

  @Column({ type: 'timestamptz' })
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
