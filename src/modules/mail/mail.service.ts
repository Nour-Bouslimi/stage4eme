import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomBytes } from 'crypto';
import * as nodemailer from 'nodemailer';
import * as sgMail from '@sendgrid/mail';

@Injectable()
export class MailService {
  private transporter: nodemailer.Transporter;
  private from: string;
  private useSendGrid = false;

  constructor(private configService: ConfigService) {
    const host =
      this.configService.get<string>('SMTP_HOST') || 'smtp.gmail.com';
    const port = Number(this.configService.get<number>('SMTP_PORT') || 587);
    const secure = port === 465;
    const user = this.configService.get<string>('SMTP_USER');
    const pass = this.configService.get<string>('SMTP_PASS');
    this.from =
      this.configService.get<string>('EMAIL_FROM') ||
      user ||
      'no-reply@example.com';

    const transportOptions: any = {
      host,
      port,
      secure,
    };
    const sendgridKey = this.configService.get<string>('SENDGRID_API_KEY');
    if (sendgridKey) {
      this.useSendGrid = true;
      sgMail.setApiKey(sendgridKey);
      console.log('SendGrid configured');
    }
    console.log('Mail config', {
      host,
      port,
      secure,
      user: user ? user : null,
      hasAuth: !!(user && pass),
    });
    if (user && pass) {
      transportOptions.auth = { user, pass };
    }

    this.transporter = nodemailer.createTransport(transportOptions);
    this.transporter
      .verify()
      .then(() => {
        console.log('Mail transporter verified');
      })
      .catch((err) => {
        console.error('Mail transporter verification failed:', err);
      });
  }

  async sendMail(to: string, subject: string, text: string, html?: string) {
    if (this.useSendGrid) {
      try {
        const msg: any = {
          to,
          from: this.from,
          subject,
          text,
        };
        if (html) msg.html = html;
        const res = await sgMail.send(msg);
        return res;
      } catch (err) {
        console.error('Failed to send email via SendGrid', {
          to,
          subject,
          error: err,
        });
        throw err;
      }
    }

    try {
      const info = await this.transporter.sendMail({
        from: this.from,
        to,
        subject,
        text,
        html,
      });
      return info;
    } catch (err) {
      console.error('Failed to send email', { to, subject, error: err });
      throw err;
    }
  }

  async sendResetPasswordEmail(to: string, resetLink: string) {
    const subject = 'Réinitialisation du mot de passe';
    const text = `Pour réinitialiser votre mot de passe, cliquez sur ce lien : ${resetLink}`;
    const html = `<p>Bonjour,</p><p>Pour réinitialiser votre mot de passe cliquez sur le lien ci-dessous :</p><p><a href="${resetLink}">${resetLink}</a></p><p>Si vous n'avez pas demandé cette réinitialisation, ignorez ce message.</p>`;
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

      if (hasUpper && hasLower && hasNumber && hasSpecial) {
        return password;
      }
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
      'Votre compte livreur a été créé par l’administrateur.',
      `Email: ${params.email}`,
      `Mot de passe temporaire: ${params.temporaryPassword}`,
      'Vous devez modifier votre mot de passe dès votre première connexion.',
      `Lien de connexion: ${params.loginUrl}`,
    ].join('\n');
    const html = `
      <p>Bonjour ${displayName},</p>
      <p>Votre compte livreur a été créé par l’administrateur.</p>
      <p><strong>Email:</strong> ${params.email}</p>
      <p><strong>Mot de passe temporaire:</strong> ${params.temporaryPassword}</p>
      <p>Vous devez modifier votre mot de passe dès votre première connexion.</p>
      <p><strong>Lien de connexion:</strong> <a href="${params.loginUrl}">${params.loginUrl}</a></p>
    `;
    return this.sendMail(params.to, subject, text, html);
  }
}
