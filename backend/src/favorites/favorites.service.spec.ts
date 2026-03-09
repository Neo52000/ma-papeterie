import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FavoritesService } from './favorites.service';
import { Favorite } from './favorite.entity';

describe('FavoritesService', () => {
  let service: FavoritesService;
  let repository: jest.Mocked<Partial<Repository<Favorite>>>;

  const mockFavorite: Favorite = {
    id: 'fav-1',
    userId: 'user-1',
    productId: 'prod-1',
    user: null as any,
    product: null as any,
    createdAt: new Date(),
  };

  beforeEach(async () => {
    repository = {
      findOne: jest.fn(),
      findAndCount: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      remove: jest.fn(),
      count: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FavoritesService,
        { provide: getRepositoryToken(Favorite), useValue: repository },
      ],
    }).compile();

    service = module.get<FavoritesService>(FavoritesService);
  });

  describe('toggle', () => {
    it("devrait ajouter un favori s'il n'existe pas", async () => {
      repository.findOne!.mockResolvedValue(null);
      repository.create!.mockReturnValue(mockFavorite);
      repository.save!.mockResolvedValue(mockFavorite);

      const result = await service.toggle('user-1', 'prod-1');

      expect(repository.findOne).toHaveBeenCalledWith({
        where: { userId: 'user-1', productId: 'prod-1' },
      });
      expect(repository.create).toHaveBeenCalledWith({
        userId: 'user-1',
        productId: 'prod-1',
      });
      expect(repository.save).toHaveBeenCalledWith(mockFavorite);
      expect(result).toEqual({ favorited: true });
    });

    it("devrait retirer un favori s'il existe déjà", async () => {
      repository.findOne!.mockResolvedValue(mockFavorite);
      repository.remove!.mockResolvedValue(mockFavorite);

      const result = await service.toggle('user-1', 'prod-1');

      expect(repository.findOne).toHaveBeenCalledWith({
        where: { userId: 'user-1', productId: 'prod-1' },
      });
      expect(repository.remove).toHaveBeenCalledWith(mockFavorite);
      expect(result).toEqual({ favorited: false });
    });
  });

  describe('findByUser', () => {
    it('devrait retourner les favoris paginés d\'un utilisateur', async () => {
      repository.findAndCount!.mockResolvedValue([[mockFavorite], 1]);

      const result = await service.findByUser('user-1', 1, 20);

      expect(repository.findAndCount).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        relations: ['product'],
        skip: 0,
        take: 20,
        order: { createdAt: 'DESC' },
      });
      expect(result).toEqual({ data: [mockFavorite], total: 1 });
    });

    it('devrait paginer correctement pour page 2', async () => {
      repository.findAndCount!.mockResolvedValue([[], 0]);

      await service.findByUser('user-1', 2, 5);

      expect(repository.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 5, take: 5 }),
      );
    });
  });

  describe('isFavorited', () => {
    it('devrait retourner true si le produit est en favori', async () => {
      repository.count!.mockResolvedValue(1);

      const result = await service.isFavorited('user-1', 'prod-1');

      expect(repository.count).toHaveBeenCalledWith({
        where: { userId: 'user-1', productId: 'prod-1' },
      });
      expect(result).toBe(true);
    });

    it("devrait retourner false si le produit n'est pas en favori", async () => {
      repository.count!.mockResolvedValue(0);

      const result = await service.isFavorited('user-1', 'prod-1');

      expect(repository.count).toHaveBeenCalledWith({
        where: { userId: 'user-1', productId: 'prod-1' },
      });
      expect(result).toBe(false);
    });
  });
});
