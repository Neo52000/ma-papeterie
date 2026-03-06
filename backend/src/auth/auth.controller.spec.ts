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
});
