import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { Logger } from '@nestjs/common';
import { MailerService } from './mailer.service';

const mockSendMail = jest.fn().mockResolvedValue({ messageId: 'test-id' });
const mockCreateTransport = jest.fn().mockReturnValue({ sendMail: mockSendMail });

jest.mock('nodemailer', () => ({
  createTransport: (...args: any[]) => mockCreateTransport(...args),
}));

describe('MailerService', () => {
  let service: MailerService;
  let configService: Partial<ConfigService>;

  describe('avec SMTP configuré', () => {
    beforeEach(async () => {
      mockSendMail.mockClear();
      mockCreateTransport.mockClear();

      configService = {
        get: jest.fn((key: string, defaultValue?: any) => {
          const config: Record<string, any> = {
            SMTP_HOST: 'smtp.example.com',
            SMTP_PORT: 587,
            SMTP_USER: 'user@example.com',
            SMTP_PASS: 'secret',
            MAIL_FROM: 'Ma Papeterie <noreply@ma-papeterie.fr>',
            FRONTEND_URL: 'http://localhost:5173',
          };
          return config[key] ?? defaultValue;
        }),
      };

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          MailerService,
          { provide: ConfigService, useValue: configService },
        ],
      }).compile();

      service = module.get<MailerService>(MailerService);
    });

    it('devrait créer un transporter nodemailer', () => {
      expect(mockCreateTransport).toHaveBeenCalledWith(
        expect.objectContaining({
          host: 'smtp.example.com',
          port: 587,
          auth: {
            user: 'user@example.com',
            pass: 'secret',
          },
        }),
      );
    });

    it('devrait envoyer un email de réinitialisation de mot de passe', async () => {
      await service.sendResetPasswordEmail('user@test.com', 'reset-token-123');

      expect(mockSendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          from: 'Ma Papeterie <noreply@ma-papeterie.fr>',
          to: 'user@test.com',
          subject: expect.stringContaining('Réinitialisation'),
          html: expect.stringContaining('reset-password?token=reset-token-123'),
        }),
      );
    });

    it('devrait envoyer un email de vérification', async () => {
      await service.sendVerificationEmail('user@test.com', 'verify-token-456');

      expect(mockSendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          from: 'Ma Papeterie <noreply@ma-papeterie.fr>',
          to: 'user@test.com',
          subject: expect.stringContaining('Vérification'),
          html: expect.stringContaining('verify-email?token=verify-token-456'),
        }),
      );
    });

    it('devrait inclure le lien frontend dans l\'email de réinitialisation', async () => {
      await service.sendResetPasswordEmail('user@test.com', 'token-abc');

      expect(mockSendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          html: expect.stringContaining('http://localhost:5173/reset-password?token=token-abc'),
        }),
      );
    });

    it('devrait inclure le lien frontend dans l\'email de vérification', async () => {
      await service.sendVerificationEmail('user@test.com', 'token-def');

      expect(mockSendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          html: expect.stringContaining('http://localhost:5173/verify-email?token=token-def'),
        }),
      );
    });
  });

  describe('sans SMTP configuré (mode développement)', () => {
    let logSpy: jest.SpyInstance;

    beforeEach(async () => {
      mockSendMail.mockClear();
      mockCreateTransport.mockClear();

      configService = {
        get: jest.fn((key: string, defaultValue?: any) => {
          const config: Record<string, any> = {
            SMTP_HOST: undefined,
            SMTP_PORT: 587,
            SMTP_USER: undefined,
            SMTP_PASS: undefined,
            MAIL_FROM: 'Ma Papeterie <noreply@ma-papeterie.fr>',
            FRONTEND_URL: 'http://localhost:5173',
          };
          return config[key] ?? defaultValue;
        }),
      };

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          MailerService,
          { provide: ConfigService, useValue: configService },
        ],
      }).compile();

      service = module.get<MailerService>(MailerService);
      logSpy = jest.spyOn(Logger.prototype, 'log').mockImplementation();
    });

    afterEach(() => {
      logSpy.mockRestore();
    });

    it('ne devrait pas créer de transporter nodemailer', () => {
      expect(mockCreateTransport).not.toHaveBeenCalled();
    });

    it('devrait afficher l\'email dans la console au lieu de l\'envoyer', async () => {
      await service.sendResetPasswordEmail('user@test.com', 'token-123');

      expect(mockSendMail).not.toHaveBeenCalled();
      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('user@test.com'),
      );
    });

    it('devrait afficher l\'email de vérification dans la console', async () => {
      await service.sendVerificationEmail('user@test.com', 'token-456');

      expect(mockSendMail).not.toHaveBeenCalled();
      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('user@test.com'),
      );
    });
  });
});
