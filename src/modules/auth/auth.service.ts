import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { createHash, randomBytes } from 'crypto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { InscriptionClientDto } from './dto/inscription-client.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { UsersService } from '../users/users.service';
import { MailService } from '../mail/mail.service';
import { toPublicUser } from '../../common/utils/api-mappers';
import { RoleUtilisateur } from '../../common/enums/role-utilisateur.enum';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private mailService: MailService,
  ) {}

  private buildToken(user: {
    id: string;
    email: string;
    role: string;
    prenom?: string;
    nom?: string;
  }) {
    return this.jwtService.sign({
      sub: user.id,
      id: user.id,
      email: user.email,
      role: user.role,
      prenom: user.prenom,
      nom: user.nom,
      mustChangePassword: (user as any).mustChangePassword ?? false,
    });
  }

  private createAuthResponse(user: any) {
    return {
      accessToken: this.buildToken(user),
      user: toPublicUser(user),
      forcePasswordChange: !!user.mustChangePassword,
    };
  }

  async registerClient(dto: InscriptionClientDto) {
    const existing = await this.usersService.findByEmail(dto.email);
    if (existing) throw new BadRequestException('Email déjà utilisé');
    const hash = await bcrypt.hash(dto.motDePasse, 10);
    const user = await this.usersService.create({
      email: dto.email,
      motDePasseHash: hash,
      prenom: dto.prenom,
      nom: dto.nom,
      telephone: dto.telephone,
      photo: dto.photo,
      adresseParDefaut: dto.adresseParDefaut,
      totalMissions: dto.totalMissions,
      missionsAnnulees: dto.missionsAnnulees,
      derniereActivite: dto.derniereActivite
        ? new Date(dto.derniereActivite)
        : undefined,
      role: RoleUtilisateur.CLIENT,
      estActif: true,
      mustChangePassword: false,
    });
    return this.createAuthResponse(user);
  }

  async registerAdmin(dto: InscriptionClientDto, secret: string) {
    const ADMIN_SECRET =
      this.configService.get<string>('ADMIN_SECRET') || 'adminsecret';
    if (secret !== ADMIN_SECRET)
      throw new UnauthorizedException('Invalid admin secret');
    const existing = await this.usersService.findByEmail(dto.email);
    if (existing) throw new BadRequestException('Email déjà utilisé');
    const hash = await bcrypt.hash(dto.motDePasse, 10);
    const user = await this.usersService.create({
      email: dto.email,
      motDePasseHash: hash,
      prenom: dto.prenom,
      nom: dto.nom,
      role: RoleUtilisateur.ADMIN,
      estActif: true,
      mustChangePassword: false,
    });
    return this.createAuthResponse(user);
  }

  /*  async validateUser(email: string, motDePasse: string) {
    const user = await this.usersService.findByEmail(email);
    if (!user || !user.estActif) return null;
    const match = await bcrypt.compare(motDePasse, user.motDePasseHash);
    if (!match) return null;
    return user;
  } */

  async validateUser(email: string, motDePasse: string) {
    const user = await this.usersService.findByEmail(
      email.trim().toLowerCase(),
    );

    if (!user || !user.estActif) {
      return null;
    }

    const match = await bcrypt.compare(motDePasse, user.motDePasseHash);

    if (!match) {
      return null;
    }

    return user;
  }
  async login(user: any) {
    if (!user) throw new UnauthorizedException();
    return this.createAuthResponse(user);
  }

  async changePassword(userId: string, dto: ChangePasswordDto) {
    const confirmation = dto.confirmPassword ?? dto.passwordConfirmation;
    if (confirmation && confirmation !== dto.newPassword) {
      throw new BadRequestException(
        'La confirmation du mot de passe ne correspond pas',
      );
    }

    const updatedUser = await this.usersService.changePassword(
      userId,
      dto.currentPassword,
      dto.newPassword,
    );
    return this.createAuthResponse(updatedUser);
  }

  async forgotPassword(dto: ForgotPasswordDto) {
    const user = await this.usersService.findByEmail(dto.email);
    if (user) {
      const token = randomBytes(32).toString('hex');
      const tokenHash = createHash('sha256').update(token).digest('hex');
      user.resetPasswordTokenHash = tokenHash;
      user.resetPasswordRequestedAt = new Date();
      user.resetPasswordTokenExpiresAt = new Date(Date.now() + 1000 * 60 * 30);
      await this.usersService.save(user);

      const frontendUrl =
        this.configService.get<string>('FRONTEND_URL') ||
        'http://localhost:4200';
      const resetLink = `${frontendUrl}/reset-password?token=${encodeURIComponent(token)}&email=${encodeURIComponent(user.email)}`;
      try {
        await this.mailService.sendResetPasswordEmail(user.email, resetLink);
      } catch (err) {
        console.error('Failed to send reset password email', err);
      }
      return {
        message:
          'Si un compte existe, un email de réinitialisation a été envoyé.',
        resetLink:
          process.env.NODE_ENV === 'production' ? undefined : resetLink,
        resetToken: process.env.NODE_ENV === 'production' ? undefined : token,
      };
    }

    return {
      message:
        'Si un compte existe, un email de réinitialisation a été envoyé.',
    };
  }

  async validateResetToken(token: string) {
    const tokenHash = createHash('sha256').update(token).digest('hex');
    const user = await this.usersService.findByResetTokenHash(tokenHash);
    if (
      !user ||
      !user.resetPasswordTokenExpiresAt ||
      user.resetPasswordTokenExpiresAt.getTime() < Date.now()
    ) {
      return { valid: false };
    }
    return { valid: true };
  }

  async resetPassword(dto: ResetPasswordDto) {
    const tokenHash = createHash('sha256').update(dto.token).digest('hex');
    const user = await this.usersService.findByResetTokenHash(tokenHash);
    console.log('[resetPassword] tokenHashPrefix=', tokenHash.slice(0, 12));
    console.log('[resetPassword] userFound=', !!user);
    console.log('[resetPassword] userId=', user?.id ?? null);
    console.log(
      '[resetPassword] motDePasseLength=',
      dto.motDePasse?.length ?? null,
    );
    if (
      !user ||
      !user.resetPasswordTokenExpiresAt ||
      user.resetPasswordTokenExpiresAt.getTime() < Date.now()
    ) {
      throw new BadRequestException(
        'Token de réinitialisation invalide ou expiré',
      );
    }

    const confirmation = dto.confirmPassword ?? dto.passwordConfirmation;
    if (confirmation && confirmation !== dto.motDePasse) {
      throw new BadRequestException(
        'La confirmation du mot de passe ne correspond pas',
      );
    }

    await this.usersService.resetPassword(user.id, dto.motDePasse);

    return { message: 'Mot de passe réinitialisé avec succès' };
  }
}
