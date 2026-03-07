import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { UnauthorizedException } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: jest.Mocked<Partial<AuthService>>;
  let jwtService: jest.Mocked<Partial<JwtService>>;

  const mockTokenResponse = {
    user: { id: 'uuid-1', email: 'test@example.com', role: 'user' },
    accessToken: 'access-token',
    refreshToken: 'refresh-token',
  };

  beforeEach(async () => {
    authService = {
      register: jest.fn().mockResolvedValue(mockTokenResponse),
      login: jest.fn().mockResolvedValue(mockTokenResponse),
      refreshToken: jest.fn().mockResolvedValue({
        accessToken: 'new-access',
        refreshToken: 'new-refresh',
      }),
      logout: jest.fn().mockResolvedValue({ message: 'Déconnexion réussie.' }),
      getProfile: jest.fn().mockResolvedValue({
        id: 'uuid-1',
        email: 'test@example.com',
        role: 'user',
      }),
      forgotPassword: jest.fn().mockResolvedValue({ message: 'OK' }),
      resetPassword: jest.fn().mockResolvedValue({ message: 'OK' }),
      verifyEmail: jest.fn().mockResolvedValue({ message: 'OK' }),
    };

    jwtService = {
      verify: jest.fn().mockReturnValue({ sub: 'uuid-1', email: 'test@example.com', role: 'user' }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: AuthService, useValue: authService },
        { provide: JwtService, useValue: jwtService },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
  });

  describe('POST /auth/register', () => {
    it('devrait appeler authService.register avec le DTO', async () => {
      const dto = { email: 'a@b.com', password: 'password123' };
      const result = await controller.register(dto);

      expect(authService.register).toHaveBeenCalledWith(dto);
      expect(result).toEqual(mockTokenResponse);
    });
  });

  describe('POST /auth/login', () => {
    it('devrait appeler authService.login avec le DTO', async () => {
      const dto = { email: 'a@b.com', password: 'password123' };
      const result = await controller.login(dto);

      expect(authService.login).toHaveBeenCalledWith(dto);
      expect(result).toEqual(mockTokenResponse);
    });
  });

  describe('POST /auth/refresh', () => {
    it('devrait rafraîchir les tokens avec un refresh token valide', async () => {
      const body = { refreshToken: 'valid-refresh-token' };
      const result = await controller.refresh(body);

      expect(jwtService.verify).toHaveBeenCalledWith('valid-refresh-token');
      expect(authService.refreshToken).toHaveBeenCalledWith('uuid-1', 'valid-refresh-token');
      expect(result).toHaveProperty('accessToken');
    });

    it('devrait lever UnauthorizedException si le refresh token est invalide', async () => {
      jwtService.verify!.mockImplementation(() => {
        throw new Error('invalid token');
      });

      const body = { refreshToken: 'invalid-token' };
      await expect(controller.refresh(body)).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('POST /auth/logout', () => {
    it('devrait appeler authService.logout pour l\'utilisateur authentifié', async () => {
      const req = { user: { sub: 'uuid-1' } };
      const result = await controller.logout(req as any);

      expect(authService.logout).toHaveBeenCalledWith('uuid-1');
      expect(result).toHaveProperty('message');
    });
  });

  describe('GET /auth/profile', () => {
    it('devrait retourner le profil de l\'utilisateur authentifié', async () => {
      const req = { user: { sub: 'uuid-1' } };
      const result = await controller.getProfile(req);

      expect(authService.getProfile).toHaveBeenCalledWith('uuid-1');
      expect(result).toHaveProperty('email');
    });
  });

  describe('POST /auth/forgot-password', () => {
    it('devrait appeler authService.forgotPassword', async () => {
      const dto = { email: 'a@b.com' };
      const result = await controller.forgotPassword(dto);

      expect(authService.forgotPassword).toHaveBeenCalledWith(dto);
      expect(result).toHaveProperty('message');
    });
  });

  describe('POST /auth/reset-password', () => {
    it('devrait appeler authService.resetPassword', async () => {
      const dto = { token: 'tok', newPassword: 'NewPass123!' };
      const result = await controller.resetPassword(dto);

      expect(authService.resetPassword).toHaveBeenCalledWith(dto);
      expect(result).toHaveProperty('message');
    });
  });

  describe('POST /auth/verify-email', () => {
    it('devrait appeler authService.verifyEmail', async () => {
      const dto = { token: 'tok' };
      const result = await controller.verifyEmail(dto);

      expect(authService.verifyEmail).toHaveBeenCalledWith(dto);
      expect(result).toHaveProperty('message');
    });
  });
});
