import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  JoinColumn,
} from 'typeorm';
import { Utilisateur } from './user.entity';

@Entity('disponibilites_livreur')
export class DisponibiliteLivreur {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ nullable: true })
  fromDay: string;

  @Column({ nullable: true })
  toDay: string;

  @Column({ default: true })
  active: boolean;

  @Column({ nullable: true })
  startTime: string;

  @Column({ nullable: true })
  endTime: string;

  @CreateDateColumn()
  createdAt: Date;

  @Column('uuid', { name: 'livreurId', nullable: true })
  livreurId: string;

  @ManyToOne(() => Utilisateur, (u) => u.disponibilites, {
    onDelete: 'CASCADE',
    nullable: true,
  })
  @JoinColumn({ name: 'livreurId' })
  livreur: Utilisateur;
}
