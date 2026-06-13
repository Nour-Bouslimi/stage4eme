import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { StatutDisponibilite } from '../../common/enums/statut-disponibilite.enum';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Utilisateur } from './entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { CreateLivreurDto } from './dto/create-livreur.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(Utilisateur)
    private usersRepository: Repository<Utilisateur>,
  ) {}

  async create(payload: Partial<Utilisateur>) {
    const user = this.usersRepository.create(payload as any);
    return this.usersRepository.save(user);
  }

  async createLivreur(dto: CreateLivreurDto) {
    const existing = await this.findByEmail(dto.email);
    if (existing) throw new BadRequestException('Email déjà utilisé');
    const hash = await bcrypt.hash(dto.motDePasse, 10);
    const u = this.usersRepository.create({
      email: dto.email,
      motDePasseHash: hash,
      telephone: dto.telephone,
      typeVehicule: dto.typeVehicule,
      poidsMaxKg: dto.poidsMaxKg,
      role: 'LIVREUR',
      estEnLigne: true,
    } as any);
    return this.usersRepository.save(u);
  }

  async findByEmail(email: string) {
    return this.usersRepository.findOne({ where: { email } });
  }

  async findById(id: string) {
    return this.usersRepository.findOne({ where: { id } });
  }

  async updateLocation(id: string, latitude: number, longitude: number, estEnLigne?: boolean) {
    const user = await this.findById(id);
    if (!user) throw new NotFoundException('Utilisateur non trouvé');
    user.latitudeActuelle = latitude;
    user.longitudeActuelle = longitude;
    user.derniereMiseAJourPosition = new Date();
    if (typeof estEnLigne === 'boolean' || typeof estEnLigne === 'number') {
      user.estEnLigne = Boolean(estEnLigne);
      user.statutDisponibilite = user.estEnLigne ? StatutDisponibilite.DISPONIBLE : StatutDisponibilite.HORS_LIGNE;
    }
    return this.usersRepository.save(user);
  }
}
