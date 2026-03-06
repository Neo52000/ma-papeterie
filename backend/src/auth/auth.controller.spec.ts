import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: jest.Mocked<Partial<AuthService>>;

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
      getProfile: jest.fn().mockResolvedValue({
        id: 'uuid-1',
        email: 'test@example.com',
        role: 'user',
      }),
      forgotPassword: jest.fn().mockResolvedValue({ message: 'OK' }),
      resetPassword: jest.fn().mockResolvedValue({ message: 'OK' }),
      verifyEmail: jest.fn().mockResolvedValue({ message: 'OK' }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [{ provide: AuthService, useValue: authService }],
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
    it('devrait rafraîchir les tokens pour l\'utilisateur authentifié', async () => {
      const req = { user: { sub: 'uuid-1' } };
      const result = await controller.refresh(req);

      expect(authService.refreshToken).toHaveBeenCalledWith('uuid-1');
      expect(result).toHaveProperty('accessToken');
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
