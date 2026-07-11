import { Injectable } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { Repository } from 'typeorm';
import { Utilisateur } from '../users/entities/user.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { TypeVehicule } from '../../common/enums/type-vehicule.enum';
import { isUserAvailableNow } from '../../common/utils/api-mappers';

@Injectable()
export class MatchingService {
  constructor(
    private usersService: UsersService,
    @InjectRepository(Utilisateur)
    private usersRepo: Repository<Utilisateur>,
  ) {}

  private haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
    const toRad = (x: number) => (x * Math.PI) / 180;
    const R = 6371; // km
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  async findCandidates(options: {
    latitudeRamassage: number;
    longitudeRamassage: number;
    typeVehiculeRequis?: TypeVehicule;
    poidsEstime?: number;
    volumeEstime?: number;
  }) {
    const all = await this.usersRepo.find({ where: { estEnLigne: true } });
    const candidates = all.filter((u) => {
      if (!isUserAvailableNow(u)) return false;
      if (options.typeVehiculeRequis && u.typeVehicule && u.typeVehicule !== options.typeVehiculeRequis) return false;
      if (options.poidsEstime && u.poidsMaxKg && Number(u.poidsMaxKg) < options.poidsEstime) return false;
      if (options.volumeEstime && u.volumeMaxM3 && Number(u.volumeMaxM3) < options.volumeEstime) return false;
      if (u.latitudeActuelle == null || u.longitudeActuelle == null) return false;
      const dist = this.haversineDistance(options.latitudeRamassage, options.longitudeRamassage, Number(u.latitudeActuelle), Number(u.longitudeActuelle));
      if (u.rayonServiceKm != null && dist > Number(u.rayonServiceKm)) return false;
      return true;
    });
    return candidates;
  }
}
