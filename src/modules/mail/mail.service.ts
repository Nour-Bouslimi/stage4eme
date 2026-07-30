/* eslint-disable prettier/prettier */
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomBytes } from 'crypto';
import { Resend } from 'resend';

@Injectable()
export class MailService {
  private resend: Resend;
  private from: string;

  constructor(private configService: ConfigService) {
    const apiKey = this.configService.get<string>('RESEND_API_KEY');
    this.resend = new Resend(apiKey);
    this.from =
      this.configService.get<string>('EMAIL_FROM') || 'onboarding@resend.dev';
  }

  async sendMail(to: string, subject: string, text: string, html?: string) {
    try {
      const res = await this.resend.emails.send({
        from: this.from,
        to,
        subject,
        text,
        html,
      });
      return res;
    } catch (err) {
      console.error('Failed to send email via Resend', { to, subject, error: err });
      throw err;
    }
  }

  async sendResetPasswordEmail(to: string, resetLink: string) {
    const subject = 'Réinitialisation du mot de passe';
    const text = `Pour réinitialiser votre mot de passe, cliquez sur ce lien : ${resetLink}`;
    const html = `<p>Bonjour,</p><p>Pour réinitialiser votre mot de passe cliquez sur le lien ci-dessous :</p><p><a href="${resetLink}">${resetLink}</a></p>`;
    return this.sendMail(to, subject, text, html);
  }

  generateTemporaryPassword(length = 12) {
    const alphabet =
      'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%^&*';
    const specials = '!@#$%^&*';
    while (true) {
      const bytes = randomBytes(length);
      let password = '';
      for (let i = 0; i < length; i += 1) {
        password += alphabet[bytes[i] % alphabet.length];
      }
      const hasUpper = /[A-Z]/.test(password);
      const hasLower = /[a-z]/.test(password);
      const hasNumber = /\d/.test(password);
      const hasSpecial = new RegExp(
        `[${specials.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}]`,
      ).test(password);
      if (hasUpper && hasLower && hasNumber && hasSpecial) return password;
    }
  }

  async sendLivreurCreatedEmail(params: {
    to: string;
    prenom?: string | null;
    nom?: string | null;
    email: string;
    temporaryPassword: string;
    loginUrl: string;
  }) {
    const subject = 'Votre compte livreur a été créé';
    const displayName =
      [params.prenom, params.nom].filter(Boolean).join(' ').trim() || 'Livreur';
    const text = [
      `Bonjour ${displayName},`,
      '',
      'Votre compte livreur a été créé par l\'administrateur.',
      `Email: ${params.email}`,
      `Mot de passe temporaire: ${params.temporaryPassword}`,
      'Vous devez modifier votre mot de passe dès votre première connexion.',
      `Lien de connexion: ${params.loginUrl}`,
    ].join('\n');
    const html = `
      <p>Bonjour ${displayName},</p>
      <p>Votre compte livreur a été créé par l'administrateur.</p>
      <p><strong>Email:</strong> ${params.email}</p>
      <p><strong>Mot de passe temporaire:</strong> ${params.temporaryPassword}</p>
      <p>Vous devez modifier votre mot de passe dès votre première connexion.</p>
      <p><strong>Lien de connexion:</strong> <a href="${params.loginUrl}">${params.loginUrl}</a></p>
    `;
    return this.sendMail(params.to, subject, text, html);
  }
}