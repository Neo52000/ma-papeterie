import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { BadRequestException, ConflictException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { MailerService } from '../mailer/mailer.service';
import { UserRole } from '../users/user.entity';

jest.mock('bcrypt');

describe('AuthService', () => {
  let authService: AuthService;
  let usersService: jest.Mocked<Partial<UsersService>>;
  let jwtService: jest.Mocked<Partial<JwtService>>;
  let mailerService: jest.Mocked<Partial<MailerService>>;

  const mockUser = {
    id: 'uuid-1',
    email: 'test@example.com',
    password: '$2b$12$hashedpassword',
    firstName: 'Test',
    lastName: 'User',
    role: UserRole.USER,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    usersService = {
      findByEmail: jest.fn(),
      findByEmailWithPassword: jest.fn(),
      findById: jest.fn(),
      findByIdWithRefreshToken: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      findByResetToken: jest.fn(),
      findByVerificationToken: jest.fn(),
    };

    jwtService = {
      sign: jest.fn().mockReturnValue('signed-token'),
    };

    mailerService = {
      sendVerificationEmail: jest.fn().mockResolvedValue(undefined),
      sendResetPasswordEmail: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: usersService },
        { provide: JwtService, useValue: jwtService },
        { provide: MailerService, useValue: mailerService },
      ],
    }).compile();

    authService = module.get<AuthService>(AuthService);
  });

  describe('register', () => {
    const registerDto = {
      email: 'new@example.com',
      password: 'password123',
      firstName: 'New',
      lastName: 'User',
    };

    it('devrait créer un utilisateur et retourner des tokens', async () => {
      usersService.findByEmail!.mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-password');
      usersService.create!.mockResolvedValue({
        ...mockUser,
        email: registerDto.email,
      });

      const result = await authService.register(registerDto);

      expect(usersService.findByEmail).toHaveBeenCalledWith(registerDto.email);
      expect(bcrypt.hash).toHaveBeenCalledWith(registerDto.password, 12);
      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result.user).toHaveProperty('email', registerDto.email);
    });

    it('devrait lever ConflictException si email déjà utilisé', async () => {
      usersService.findByEmail!.mockResolvedValue(mockUser);

      await expect(authService.register(registerDto)).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('login', () => {
    const loginDto = { email: 'test@example.com', password: 'password123' };

    it('devrait retourner des tokens si identifiants valides', async () => {
      usersService.findByEmailWithPassword!.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await authService.login(loginDto);

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result.user.email).toBe(loginDto.email);
    });

    it('devrait lever UnauthorizedException si email inconnu', async () => {
      usersService.findByEmailWithPassword!.mockResolvedValue(null);

      await expect(authService.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('devrait lever UnauthorizedException si mot de passe incorrect', async () => {
      usersService.findByEmailWithPassword!.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(authService.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('devrait lever UnauthorizedException si compte désactivé', async () => {
      usersService.findByEmailWithPassword!.mockResolvedValue({
        ...mockUser,
        isActive: false,
      });

      await expect(authService.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('refreshToken', () => {
    const mockUserWithHash = {
      ...mockUser,
      refreshTokenHash: '$2b$10$hashedrefreshtoken',
    };

    it('devrait retourner de nouveaux tokens si le refresh token est valide', async () => {
      usersService.findByIdWithRefreshToken!.mockResolvedValue(mockUserWithHash);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      (bcrypt.hash as jest.Mock).mockResolvedValue('new-hashed-refresh');

      const result = await authService.refreshToken(mockUser.id, 'valid-refresh-token');

      expect(usersService.findByIdWithRefreshToken).toHaveBeenCalledWith(mockUser.id);
      expect(bcrypt.compare).toHaveBeenCalledWith('valid-refresh-token', mockUserWithHash.refreshTokenHash);
      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
    });

    it('devrait lever UnauthorizedException si utilisateur introuvable', async () => {
      usersService.findByIdWithRefreshToken!.mockResolvedValue(null);

      await expect(authService.refreshToken('unknown-id', 'token')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('devrait lever UnauthorizedException si aucun hash stocké', async () => {
      usersService.findByIdWithRefreshToken!.mockResolvedValue({
        ...mockUser,
        refreshTokenHash: null,
      });

      await expect(authService.refreshToken(mockUser.id, 'token')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('devrait lever UnauthorizedException si le refresh token est invalide', async () => {
      usersService.findByIdWithRefreshToken!.mockResolvedValue(mockUserWithHash);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(authService.refreshToken(mockUser.id, 'bad-token')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('logout', () => {
    it('devrait mettre le refreshTokenHash à null', async () => {
      usersService.update!.mockResolvedValue(mockUser as any);

      const result = await authService.logout(mockUser.id);

      expect(usersService.update).toHaveBeenCalledWith(mockUser.id, {
        refreshTokenHash: null,
      });
      expect(result).toHaveProperty('message');
    });
  });

  describe('getProfile', () => {
    it('devrait retourner le profil utilisateur', async () => {
      const { password, ...userWithoutPassword } = mockUser;
      usersService.findById!.mockResolvedValue(userWithoutPassword as any);

      const result = await authService.getProfile(mockUser.id);

      expect(result).toHaveProperty('email', mockUser.email);
    });

    it('devrait lever UnauthorizedException si utilisateur introuvable', async () => {
      usersService.findById!.mockResolvedValue(null);

      await expect(authService.getProfile('unknown-id')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('forgotPassword', () => {
    it('devrait générer un token si email existe', async () => {
      usersService.findByEmail!.mockResolvedValue(mockUser);
      usersService.update!.mockResolvedValue(mockUser as any);

      const result = await authService.forgotPassword({ email: 'test@example.com' });

      expect(usersService.update).toHaveBeenCalledWith(
        mockUser.id,
        expect.objectContaining({
          resetPasswordToken: expect.any(String),
          resetPasswordExpires: expect.any(Date),
        }),
      );
      expect(result.message).toContain('Si cet email existe');
    });

    it('devrait retourner le même message si email n\'existe pas', async () => {
      usersService.findByEmail!.mockResolvedValue(null);

      const result = await authService.forgotPassword({ email: 'unknown@example.com' });

      expect(usersService.update).not.toHaveBeenCalled();
      expect(result.message).toContain('Si cet email existe');
    });
  });

  describe('resetPassword', () => {
    it('devrait réinitialiser le mot de passe avec un token valide', async () => {
      usersService.findByResetToken!.mockResolvedValue(mockUser);
      (bcrypt.hash as jest.Mock).mockResolvedValue('new-hashed');
      usersService.update!.mockResolvedValue(mockUser as any);

      const result = await authService.resetPassword({
        token: 'valid-token',
        newPassword: 'NewPass123!',
      });

      expect(usersService.update).toHaveBeenCalledWith(
        mockUser.id,
        expect.objectContaining({ password: 'new-hashed' }),
      );
      expect(result.message).toContain('réinitialisé');
    });

    it('devrait lever BadRequestException si token invalide', async () => {
      usersService.findByResetToken!.mockResolvedValue(null);

      await expect(
        authService.resetPassword({ token: 'bad-token', newPassword: 'NewPass123!' }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('verifyEmail', () => {
    it('devrait vérifier l\'email avec un token valide', async () => {
      usersService.findByVerificationToken!.mockResolvedValue(mockUser);
      usersService.update!.mockResolvedValue(mockUser as any);

      const result = await authService.verifyEmail({ token: 'valid-token' });

      expect(usersService.update).toHaveBeenCalledWith(
        mockUser.id,
        expect.objectContaining({ emailVerified: true }),
      );
      expect(result.message).toContain('vérifié');
    });

    it('devrait lever BadRequestException si token invalide', async () => {
      usersService.findByVerificationToken!.mockResolvedValue(null);

      await expect(
        authService.verifyEmail({ token: 'bad-token' }),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
