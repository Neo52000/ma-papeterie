import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

@Injectable()
export class MailerService {
  private readonly logger = new Logger(MailerService.name);
  private transporter: Transporter | null = null;
  private readonly mailFrom: string;
  private readonly frontendUrl: string;

  constructor(private readonly configService: ConfigService) {
    const smtpHost = this.configService.get<string>('SMTP_HOST');
    this.mailFrom = this.configService.get<string>(
      'MAIL_FROM',
      'Ma Papeterie <noreply@ma-papeterie.fr>',
    );
    this.frontendUrl = this.configService.get<string>(
      'FRONTEND_URL',
      'http://localhost:5173',
    );

    if (smtpHost) {
      this.transporter = nodemailer.createTransport({
        host: smtpHost,
        port: this.configService.get<number>('SMTP_PORT', 587),
        secure: this.configService.get<number>('SMTP_PORT', 587) === 465,
        auth: {
          user: this.configService.get<string>('SMTP_USER'),
          pass: this.configService.get<string>('SMTP_PASS'),
        },
      });
      this.logger.log('SMTP transporter configured');
    } else {
      this.logger.warn(
        'SMTP_HOST non configuré — les emails seront affichés dans la console',
      );
    }
  }

  async sendResetPasswordEmail(to: string, token: string): Promise<void> {
    const resetLink = `${this.frontendUrl}/reset-password?token=${token}`;
    const subject = 'Réinitialisation de votre mot de passe — Ma Papeterie';
    const html = `
      <h1>Réinitialisation de mot de passe</h1>
      <p>Vous avez demandé la réinitialisation de votre mot de passe.</p>
      <p>Cliquez sur le lien ci-dessous pour définir un nouveau mot de passe :</p>
      <p><a href="${resetLink}">${resetLink}</a></p>
      <p>Ce lien expire dans 1 heure.</p>
      <p>Si vous n'avez pas demandé cette réinitialisation, ignorez cet email.</p>
    `;

    await this.sendMail(to, subject, html);
  }

  async sendVerificationEmail(to: string, token: string): Promise<void> {
    const verifyLink = `${this.frontendUrl}/verify-email?token=${token}`;
    const subject = 'Vérification de votre email — Ma Papeterie';
    const html = `
      <h1>Bienvenue sur Ma Papeterie !</h1>
      <p>Merci de vous être inscrit. Veuillez vérifier votre adresse email en cliquant sur le lien ci-dessous :</p>
      <p><a href="${verifyLink}">${verifyLink}</a></p>
      <p>Si vous n'avez pas créé de compte, ignorez cet email.</p>
    `;

    await this.sendMail(to, subject, html);
  }

  private async sendMail(
    to: string,
    subject: string,
    html: string,
  ): Promise<void> {
    const mailOptions = {
      from: this.mailFrom,
      to,
      subject,
      html,
    };

    if (this.transporter) {
      await this.transporter.sendMail(mailOptions);
      this.logger.log(`Email envoyé à ${to}: ${subject}`);
    } else {
      this.logger.log(
        `[DEV] Email non envoyé (pas de SMTP configuré):\n` +
          `  To: ${to}\n` +
          `  Subject: ${subject}\n` +
          `  Body: ${html}`,
      );
    }
  }
}
