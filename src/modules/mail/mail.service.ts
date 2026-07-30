import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomBytes } from 'crypto';
import { BrevoClient } from '@getbrevo/brevo';

type EmailTemplateParams = {
  title: string;
  preheader: string;
  body: string;
};

@Injectable()
export class MailService {
  private client: BrevoClient;
  private from: string;
  private readonly brandName = 'DeliverEase';
  private readonly brandAccent = '#ff7138';
  private readonly brandAccentSoft = '#ffe4d6';
  private readonly brandPrimary = '#1f4f86';
  private readonly brandPrimaryDark = '#0e2448';
  private readonly brandBackground = '#f3f7fc';
  private readonly brandInput = '#dfe8fb';
  private readonly brandCard = '#ffffff';
  private readonly brandText = '#24324c';
  private readonly brandMuted = '#6b7d9c';
  private logoUrl = '';

  constructor(private configService: ConfigService) {
    this.client = new BrevoClient({
      apiKey: this.configService.get<string>('BREVO_API_KEY') || '',
    });
    this.from =
      this.configService.get<string>('EMAIL_FROM') ||
      'bousliminour70@gmail.com';
    this.logoUrl = this.configService.get<string>('EMAIL_LOGO_URL') || '';
  }

  private escapeHtml(value: string) {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  private buildButton(
    label: string,
    href: string,
    variant: 'primary' | 'accent' = 'primary',
  ) {
    const background = variant === 'accent' ? this.brandAccent : this.brandPrimary;
    return `
      <a
        href="${this.escapeHtml(href)}"
        style="
          display:inline-block;
          padding:14px 26px;
          border-radius:12px;
          background:${background};
          color:#ffffff;
          text-decoration:none;
          font-weight:700;
          font-size:15px;
          line-height:1;
          box-shadow:0 10px 24px rgba(15, 23, 42, 0.12);
        "
      >${this.escapeHtml(label)}</a>
    `;
  }

  private buildLogo() {
    if (this.logoUrl) {
      return `
        <img
          src="${this.escapeHtml(this.logoUrl)}"
          alt="${this.escapeHtml(this.brandName)}"
          width="44"
          height="44"
          style="display:block; border-radius:14px; object-fit:cover;"
        />
      `;
    }

    return `
      <div
        style="
          width:44px;
          height:44px;
          border-radius:14px;
          background:linear-gradient(135deg, ${this.brandPrimaryDark} 0%, ${this.brandPrimary} 100%);
          color:#ffffff;
          font-weight:800;
          font-size:16px;
          line-height:44px;
          text-align:center;
          box-shadow:0 10px 20px rgba(14, 36, 72, 0.18);
        "
      >🚚</div>
    `;
  }

  private buildInfoRow(label: string, value: string, emphasized = false) {
    const valueColor = emphasized ? this.brandText : this.brandMuted;
    return `
      <tr>
        <td style="padding:10px 0; color:${this.brandMuted}; font-size:13px; width:180px;">${this.escapeHtml(label)}</td>
        <td style="padding:10px 0; color:${valueColor}; font-size:14px; font-weight:${emphasized ? 700 : 500}; word-break:break-word;">
          ${this.escapeHtml(value)}
        </td>
      </tr>
    `;
  }

  private buildEmailTemplate({ title, preheader, body }: EmailTemplateParams) {
    return `
      <!DOCTYPE html>
      <html lang="fr">
        <head>
          <meta charset="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <meta name="x-apple-disable-message-reformatting" />
          <title>${this.escapeHtml(title)}</title>
        </head>
        <body style="margin:0; padding:0; background:${this.brandBackground}; font-family:Arial, Helvetica, sans-serif; color:${this.brandText};">
          <div style="display:none; max-height:0; overflow:hidden; opacity:0; mso-hide:all;">${this.escapeHtml(preheader)}</div>
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:${this.brandBackground}; width:100%;">
            <tr>
              <td align="center" style="padding:32px 16px;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:640px; width:100%;">
                  <tr>
                    <td style="background:linear-gradient(135deg, ${this.brandPrimaryDark} 0%, ${this.brandPrimary} 100%); border-radius:24px 24px 0 0; padding:28px 32px;">
                      <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="width:100%;">
                        <tr>
                          <td style="vertical-align:middle; width:64px;">
                            ${this.buildLogo()}
                          </td>
                          <td style="vertical-align:middle;">
                            <div style="font-size:13px; letter-spacing:0.18em; text-transform:uppercase; font-weight:700; color:#dbeafe; margin-bottom:4px;">
                              ${this.brandName}
                            </div>
                            <div style="font-size:28px; line-height:1.2; color:#ffffff; font-weight:800;">${this.escapeHtml(title)}</div>
                          </td>
                        </tr>
                      </table>
                      <div style="margin-top:12px; color:#dbeafe; font-size:15px; line-height:1.6;">
                        ${this.escapeHtml(preheader)}
                      </div>
                    </td>
                  </tr>
                  <tr>
                    <td style="background:${this.brandCard}; padding:32px; border-left:1px solid #d8e3f6; border-right:1px solid #d8e3f6;">
                      ${body}
                    </td>
                  </tr>
                  <tr>
                    <td style="background:${this.brandCard}; padding:0 32px 28px 32px; border-left:1px solid #d8e3f6; border-right:1px solid #d8e3f6;">
                      <div style="height:1px; background:#e2e8f0; margin-bottom:18px;"></div>
                      <div style="font-size:12px; line-height:1.7; color:${this.brandMuted};">
                        Si vous n'etes pas a l'origine de cette demande, vous pouvez ignorer cet email.
                      </div>
                    </td>
                  </tr>
                  <tr>
                    <td style="background:${this.brandCard}; padding:0 32px 32px 32px; border-left:1px solid #d8e3f6; border-right:1px solid #d8e3f6; border-bottom:1px solid #d8e3f6; border-radius:0 0 24px 24px;">
                      <div style="font-size:12px; color:#94a3b8; line-height:1.6;">
                        ${this.brandName} - messagerie automatique.
                      </div>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
      </html>
    `;
  }

  async sendMail(to: string, subject: string, text: string, html?: string) {
    try {
      const res = await this.client.transactionalEmails.sendTransacEmail({
        sender: { email: this.from, name: this.brandName },
        to: [{ email: to }],
        subject,
        htmlContent: html || `<p>${text}</p>`,
      });
      return res;
    } catch (err) {
      console.error('Failed to send email via Brevo', { to, subject, error: err });
      throw err;
    }
  }

  async sendResetPasswordEmail(to: string, resetLink: string) {
    const subject = 'Reinitialisation du mot de passe';
    const text = `Bonjour,\n\nPour reinitialiser votre mot de passe, cliquez sur ce lien : ${resetLink}\n\nSi vous n'etes pas a l'origine de cette demande, ignorez cet email.`;
    const html = this.buildEmailTemplate({
      title: 'Reinitialisation du mot de passe',
      preheader:
        'Utilisez le bouton ci-dessous pour definir un nouveau mot de passe en toute securite.',
      body: `
        <p style="margin:0 0 16px 0; font-size:15px; line-height:1.8; color:${this.brandMuted};">
          Bonjour,
        </p>
        <p style="margin:0 0 22px 0; font-size:15px; line-height:1.8; color:${this.brandMuted};">
          Nous avons recu une demande de reinitialisation de votre mot de passe. Cliquez sur le bouton ci-dessous pour continuer.
        </p>
        <div style="margin:0 0 24px 0;">${this.buildButton('Reinitialiser mon mot de passe', resetLink)}</div>
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:${this.brandBackground}; border:1px solid #d8e3f6; border-radius:16px; overflow:hidden;">
          <tr>
            <td style="padding:16px 18px;">
              <div style="font-size:13px; font-weight:700; color:${this.brandText}; margin-bottom:8px;">Lien de secours</div>
              <div style="font-size:13px; line-height:1.8; color:${this.brandMuted}; word-break:break-all;">
                ${this.escapeHtml(resetLink)}
              </div>
            </td>
          </tr>
        </table>
        <p style="margin:20px 0 0 0; font-size:13px; line-height:1.7; color:${this.brandMuted};">
          Pour votre securite, ce lien expire apres un court delai.
        </p>
      `,
    });
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
    const subject = 'Votre compte livreur a ete cree';
    const displayName =
      [params.prenom, params.nom].filter(Boolean).join(' ').trim() || 'Livreur';
    const text = [
      `Bonjour ${displayName},`,
      '',
      "Votre compte livreur a ete cree par l'administrateur.",
      `Email: ${params.email}`,
      `Mot de passe temporaire: ${params.temporaryPassword}`,
      'Vous devez modifier votre mot de passe des votre premiere connexion.',
      `Lien de connexion: ${params.loginUrl}`,
    ].join('\n');
    const html = this.buildEmailTemplate({
      title: 'Votre compte livreur est pret',
      preheader:
        'Accedez a votre espace, puis changez votre mot de passe temporaire lors de la premiere connexion.',
      body: `
        <p style="margin:0 0 16px 0; font-size:15px; line-height:1.8; color:${this.brandMuted};">
          Bonjour ${this.escapeHtml(displayName)},
        </p>
        <p style="margin:0 0 24px 0; font-size:15px; line-height:1.8; color:${this.brandMuted};">
          Votre compte livreur a ete cree par l'administrateur. Vous trouverez ci-dessous vos acces de connexion.
        </p>
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border:1px solid #d8e3f6; border-radius:18px; overflow:hidden; background:${this.brandCard};">
          <tr>
            <td style="padding:20px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                ${this.buildInfoRow('Email', params.email)}
                ${this.buildInfoRow('Mot de passe temporaire', params.temporaryPassword, true)}
              </table>
            </td>
          </tr>
        </table>
        <div style="margin:24px 0 18px 0;">${this.buildButton('Acceder a la connexion', params.loginUrl, 'accent')}</div>
        <p style="margin:0; font-size:13px; line-height:1.7; color:${this.brandMuted};">
          Pensez a remplacer le mot de passe temporaire des votre premiere connexion.
        </p>
      `,
    });
    return this.sendMail(params.to, subject, text, html);
  }
}
