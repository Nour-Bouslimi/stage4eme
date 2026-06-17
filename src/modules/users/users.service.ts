import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { Repository } from 'typeorm';
import { RoleUtilisateur } from '../../common/enums/role-utilisateur.enum';
import { StatutDisponibilite } from '../../common/enums/statut-disponibilite.enum';
import { TypeVehicule } from '../../common/enums/type-vehicule.enum';
import { CreateLivreurDto } from './dto/create-livreur.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { Utilisateur } from './entities/user.entity';
import { DisponibiliteLivreur } from './entities/disponibilite-livreur.entity';

type AvailabilityInput = {
  day?: string;
  active?: boolean;
  startTime?: string;
  endTime?: string;
  heureDebut?: string;
  heureFin?: string;
};

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(Utilisateur)
    private readonly usersRepository: Repository<Utilisateur>,
    @InjectRepository(DisponibiliteLivreur)
    private readonly disponibiliteRepository: Repository<DisponibiliteLivreur>,
  ) {}

  private normalizeVehicle(input: Partial<CreateLivreurDto> | Partial<Utilisateur>) {
    const vehicule = (input as any).vehicule ?? {};
    return {
      typeVehicule: (input as any).typeVehicule ?? vehicule.type ?? null,
      immatriculationVehicule: (input as any).immatriculationVehicule ?? vehicule.immatriculation ?? null,
      photoVehicule: (input as any).photoVehicule ?? vehicule.photo ?? null,
      poidsMaxKg: (input as any).poidsMaxKg ?? vehicule.poidsMax ?? null,
      volumeMaxM3: (input as any).volumeMaxM3 ?? vehicule.volumeMax ?? null,
      rayonServiceKm: (input as any).rayonServiceKm ?? vehicule.rayonService ?? null,
    };
  }

  private normalizeAvailability(input: AvailabilityInput) {
    return {
      day: input.day ?? undefined,
      active: typeof input.active === 'boolean' ? input.active : true,
      startTime: input.startTime ?? undefined,
      endTime: input.endTime ?? undefined,
    };
  }

  async create(payload: Partial<Utilisateur>) {
    const user = this.usersRepository.create(payload as any);
    return this.usersRepository.save(user);
  }

  async save(user: Partial<Utilisateur>) {
    return this.usersRepository.save(user as Utilisateur);
  }

  async findByEmail(email: string) {
    return this.usersRepository.findOne({
      where: { email },
      relations: {
        disponibilites: true,
        missionsCreees: true,
        missionsAcceptees: true,
        notesDonnees: true,
        messages: true,
        notifications: true,
      } as any,
    });
  }

  async findByResetTokenHash(resetPasswordTokenHash: string) {
    return this.usersRepository.findOne({
      where: { resetPasswordTokenHash },
      relations: {
        disponibilites: true,
      } as any,
    });
  }

  async findById(id: string) {
    return this.usersRepository.findOne({
      where: { id },
      relations: {
        disponibilites: true,
        missionsCreees: true,
        missionsAcceptees: true,
        notesDonnees: true,
        messages: true,
        notifications: true,
      } as any,
    });
  }

  async findAllClients() {
    return this.usersRepository.find({
      where: { role: RoleUtilisateur.CLIENT },
      order: { createdAt: 'DESC' },
      relations: { disponibilites: true } as any,
    });
  }

  async findAllLivreurs() {
    return this.usersRepository.find({
      where: { role: RoleUtilisateur.LIVREUR },
      order: { createdAt: 'DESC' },
      relations: { disponibilites: true } as any,
    });
  }

  async findLivreursDisponibles() {
    return this.usersRepository.find({
      where: {
        role: RoleUtilisateur.LIVREUR,
        estActif: true,
        estEnLigne: true,
        statutDisponibilite: StatutDisponibilite.DISPONIBLE,
      },
      order: { updatedAt: 'DESC' },
      relations: { disponibilites: true } as any,
    });
  }

  async findLivreurById(id: string) {
    const user = await this.findById(id);
    if (!user || user.role !== RoleUtilisateur.LIVREUR) {
      throw new NotFoundException('Livreur non trouvé');
    }
    return user;
  }

  async createLivreur(dto: CreateLivreurDto) {
    const existing = await this.findByEmail(dto.email);
    if (existing) throw new BadRequestException('Email déjà utilisé');

    const hash = await bcrypt.hash(dto.motDePasse, 10);
    const vehicle = this.normalizeVehicle(dto);
    const user = this.usersRepository.create({
      email: dto.email,
      motDePasseHash: hash,
      telephone: dto.telephone,
      cin: dto.cin,
      photoCin: dto.photoCin,
      typeVehicule: vehicle.typeVehicule as TypeVehicule,
      immatriculationVehicule: vehicle.immatriculationVehicule,
      photoVehicule: vehicle.photoVehicule,
      poidsMaxKg: vehicle.poidsMaxKg,
      volumeMaxM3: vehicle.volumeMaxM3,
      rayonServiceKm: vehicle.rayonServiceKm,
      statutDisponibilite: dto.statutDisponibilite || StatutDisponibilite.DISPONIBLE,
      noteMoyenne: dto.noteMoyenne || 0,
      totalNotes: dto.totalNotes || 0,
      latitudeActuelle: dto.latitudeActuelle,
      longitudeActuelle: dto.longitudeActuelle,
      estEnLigne: typeof dto.estEnLigne === 'boolean' ? dto.estEnLigne : true,
      role: RoleUtilisateur.LIVREUR,
    } as any);

    const saved = (await this.usersRepository.save(user as unknown as Utilisateur)) as unknown as Utilisateur;
    if (dto.disponibilites?.length) {
      await this.setDisponibilites(saved.id, dto.disponibilites);
    }
    return this.findById(saved.id);
  }

  async updateProfile(id: string, dto: UpdateUserDto) {
    const user = await this.findById(id);
    if (!user) throw new NotFoundException('Utilisateur non trouvé');

    if (typeof dto.prenom === 'string') user.prenom = dto.prenom;
    if (typeof dto.nom === 'string') user.nom = dto.nom;
    if (typeof dto.telephone === 'string') user.telephone = dto.telephone;
    if (typeof dto.adresseParDefaut === 'string') user.adresseParDefaut = dto.adresseParDefaut;
    if (typeof dto.photo === 'string') user.photo = dto.photo;
    if (typeof dto.avatar === 'string') user.photo = dto.avatar;

    if (dto.disponibilites) {
      await this.setDisponibilites(id, dto.disponibilites as AvailabilityInput[]);
    }

    return this.usersRepository.save(user);
  }

  async setDisponibilites(userId: string, disponibilites: AvailabilityInput[]) {
    const user = await this.findById(userId);
    if (!user) throw new NotFoundException('Utilisateur non trouvé');

    await this.disponibiliteRepository
      .createQueryBuilder()
      .delete()
      .where('livreurId = :userId', { userId })
      .execute();
    const slots = disponibilites.map((slot) =>
      this.disponibiliteRepository.create({
        ...(this.normalizeAvailability(slot) as any),
        livreur: { id: userId } as any,
      } as any),
    );
    return this.disponibiliteRepository.save(slots as unknown as DisponibiliteLivreur[]);
  }

  async deactivateUser(id: string) {
    const user = await this.findById(id);
    if (!user) throw new NotFoundException('Utilisateur non trouvé');
    user.estActif = false;
    return this.usersRepository.save(user);
  }

  async removeUser(id: string) {
    const user = await this.findById(id);
    if (!user) throw new NotFoundException('Utilisateur non trouvé');
    await this.usersRepository.remove(user);
  }

  async updateLocation(id: string, latitude?: number, longitude?: number, estEnLigne?: boolean) {
    const user = await this.findById(id);
    if (!user) throw new NotFoundException('Utilisateur non trouvé');

    if (typeof latitude === 'number') {
      user.latitudeActuelle = latitude;
      user.derniereMiseAJourPosition = new Date();
    }

    if (typeof longitude === 'number') {
      user.longitudeActuelle = longitude;
      user.derniereMiseAJourPosition = new Date();
    }

    if (typeof estEnLigne === 'boolean') {
      user.estEnLigne = estEnLigne;
      user.statutDisponibilite = user.estEnLigne ? StatutDisponibilite.DISPONIBLE : StatutDisponibilite.HORS_LIGNE;
    }

    return this.usersRepository.save(user);
  }

  async updatePhoto(id: string, photoUrl: string) {
    const user = await this.findById(id);
    if (!user) throw new NotFoundException('Utilisateur non trouvé');
    user.photo = photoUrl;
    return this.usersRepository.save(user);
  }
}
