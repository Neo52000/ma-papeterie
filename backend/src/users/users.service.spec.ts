import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UsersService } from './users.service';
import { User, UserRole } from './user.entity';

describe('UsersService', () => {
  let service: UsersService;
  let repository: jest.Mocked<Partial<Repository<User>>>;

  const mockUser: User = {
    id: 'uuid-1',
    email: 'test@example.com',
    password: 'hashed',
    firstName: 'Test',
    lastName: 'User',
    role: UserRole.USER,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    repository = {
      findOne: jest.fn(),
      findAndCount: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
      createQueryBuilder: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: getRepositoryToken(User), useValue: repository },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  describe('findByEmail', () => {
    it('devrait retourner un utilisateur par email', async () => {
      repository.findOne!.mockResolvedValue(mockUser);

      const result = await service.findByEmail('test@example.com');

      expect(repository.findOne).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
      });
      expect(result).toEqual(mockUser);
    });

    it('devrait retourner null si email introuvable', async () => {
      repository.findOne!.mockResolvedValue(null);

      const result = await service.findByEmail('unknown@example.com');

      expect(result).toBeNull();
    });
  });

  describe('findByEmailWithPassword', () => {
    it('devrait retourner un utilisateur avec le mot de passe', async () => {
      const mockQb = {
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(mockUser),
      };
      repository.createQueryBuilder!.mockReturnValue(mockQb as any);

      const result = await service.findByEmailWithPassword('test@example.com');

      expect(repository.createQueryBuilder).toHaveBeenCalledWith('user');
      expect(mockQb.addSelect).toHaveBeenCalledWith('user.password');
      expect(mockQb.where).toHaveBeenCalledWith('user.email = :email', {
        email: 'test@example.com',
      });
      expect(result).toEqual(mockUser);
    });
  });

  describe('findById', () => {
    it('devrait retourner un utilisateur par ID', async () => {
      repository.findOne!.mockResolvedValue(mockUser);

      const result = await service.findById('uuid-1');

      expect(repository.findOne).toHaveBeenCalledWith({
        where: { id: 'uuid-1' },
      });
      expect(result).toEqual(mockUser);
    });

    it('devrait retourner null si ID introuvable', async () => {
      repository.findOne!.mockResolvedValue(null);

      const result = await service.findById('unknown');

      expect(result).toBeNull();
    });
  });

  describe('create', () => {
    it('devrait créer et sauvegarder un utilisateur', async () => {
      const data = { email: 'new@example.com', password: 'hashed' };
      repository.create!.mockReturnValue({ ...mockUser, ...data } as User);
      repository.save!.mockResolvedValue({ ...mockUser, ...data } as User);

      const result = await service.create(data);

      expect(repository.create).toHaveBeenCalledWith(data);
      expect(repository.save).toHaveBeenCalled();
      expect(result.email).toBe('new@example.com');
    });
  });

  describe('update', () => {
    it('devrait mettre à jour un utilisateur et le retourner', async () => {
      const updated = { ...mockUser, firstName: 'Updated' };
      repository.update!.mockResolvedValue({ affected: 1 } as any);
      repository.findOne!.mockResolvedValue(updated);

      const result = await service.update('uuid-1', { firstName: 'Updated' });

      expect(repository.update).toHaveBeenCalledWith('uuid-1', {
        firstName: 'Updated',
      });
      expect(result).toEqual(updated);
    });
  });

  describe('softDelete', () => {
    it('devrait désactiver un utilisateur', async () => {
      repository.update!.mockResolvedValue({ affected: 1 } as any);

      await service.softDelete('uuid-1');

      expect(repository.update).toHaveBeenCalledWith('uuid-1', {
        isActive: false,
      });
    });
  });

  describe('findAll', () => {
    it('devrait retourner les utilisateurs paginés', async () => {
      repository.findAndCount!.mockResolvedValue([[mockUser], 1]);

      const result = await service.findAll(1, 20);

      expect(repository.findAndCount).toHaveBeenCalledWith({
        skip: 0,
        take: 20,
        order: { createdAt: 'DESC' },
      });
      expect(result).toEqual({ data: [mockUser], total: 1 });
    });

    it('devrait calculer le skip correctement pour page 2', async () => {
      repository.findAndCount!.mockResolvedValue([[], 0]);

      await service.findAll(2, 10);

      expect(repository.findAndCount).toHaveBeenCalledWith({
        skip: 10,
        take: 10,
        order: { createdAt: 'DESC' },
      });
    });
  });
});
