import { Test, TestingModule } from '@nestjs/testing';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { UserRole } from './user.entity';

describe('UsersController', () => {
  let controller: UsersController;
  let usersService: jest.Mocked<Partial<UsersService>>;

  const mockUser = {
    id: 'uuid-1',
    email: 'test@example.com',
    firstName: 'Test',
    lastName: 'User',
    role: UserRole.USER,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    usersService = {
      findAll: jest.fn().mockResolvedValue({ data: [mockUser], total: 1 }),
      findById: jest.fn().mockResolvedValue(mockUser),
      update: jest.fn().mockResolvedValue({ ...mockUser, firstName: 'Updated' }),
      softDelete: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [{ provide: UsersService, useValue: usersService }],
    }).compile();

    controller = module.get<UsersController>(UsersController);
  });

  describe('GET /users', () => {
    it('devrait lister les utilisateurs avec pagination par défaut', async () => {
      const result = await controller.findAll();

      expect(usersService.findAll).toHaveBeenCalledWith(1, 20);
      expect(result).toEqual({ data: [mockUser], total: 1 });
    });

    it('devrait parser page et limit depuis les query params', async () => {
      await controller.findAll('2', '10');

      expect(usersService.findAll).toHaveBeenCalledWith(2, 10);
    });
  });

  describe('GET /users/:id', () => {
    it('devrait retourner un utilisateur par ID', async () => {
      const result = await controller.findOne('uuid-1');

      expect(usersService.findById).toHaveBeenCalledWith('uuid-1');
      expect(result).toEqual(mockUser);
    });
  });

  describe('PATCH /users/:id', () => {
    it('devrait mettre à jour un utilisateur', async () => {
      const data = { firstName: 'Updated' };
      const result = await controller.update('uuid-1', data);

      expect(usersService.update).toHaveBeenCalledWith('uuid-1', data);
      expect(result!.firstName).toBe('Updated');
    });
  });

  describe('DELETE /users/:id', () => {
    it('devrait désactiver un utilisateur (soft-delete)', async () => {
      await controller.remove('uuid-1');

      expect(usersService.softDelete).toHaveBeenCalledWith('uuid-1');
    });
  });
});
