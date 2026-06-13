import { Injectable, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { InscriptionClientDto } from './dto/inscription-client.dto';

@Injectable()
export class AuthService {
  constructor(private usersService: UsersService, private jwtService: JwtService) {}

  async registerClient(dto: InscriptionClientDto) {
    const existing = await this.usersService.findByEmail(dto.email);
    if (existing) throw new BadRequestException('Email déjà utilisé');
    const hash = await bcrypt.hash(dto.motDePasse, 10);
    const user = await this.usersService.create({
      email: dto.email,
      motDePasseHash: hash,
      prenom: dto.prenom,
      nom: dto.nom,
    } as any);
    return user;
  }

  async registerAdmin(dto: InscriptionClientDto, secret: string) {
    const ADMIN_SECRET = process.env.ADMIN_SECRET || 'adminsecret';
    if (secret !== ADMIN_SECRET) throw new UnauthorizedException('Invalid admin secret');
    const existing = await this.usersService.findByEmail(dto.email);
    if (existing) throw new BadRequestException('Email déjà utilisé');
    const hash = await bcrypt.hash(dto.motDePasse, 10);
    const user = await this.usersService.create({
      email: dto.email,
      motDePasseHash: hash,
      prenom: dto.prenom,
      nom: dto.nom,
      role: 'ADMIN',
    } as any);
    return user;
  }

  async validateUser(email: string, motDePasse: string) {
    const user = await this.usersService.findByEmail(email);
    if (!user) return null;
    const match = await bcrypt.compare(motDePasse, user.motDePasseHash);
    if (!match) return null;
    return user;
  }

  async login(user: any) {
    if (!user) throw new UnauthorizedException();
    const payload = { sub: user.id, role: user.role };
    return { accessToken: this.jwtService.sign(payload) };
  }
}
