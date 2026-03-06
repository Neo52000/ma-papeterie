import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, ILike } from 'typeorm';
import { NotFoundException } from '@nestjs/common';
import { ProductsService } from './products.service';
import { Product } from './product.entity';

describe('ProductsService', () => {
  let service: ProductsService;
  let repository: jest.Mocked<Partial<Repository<Product>>>;

  const mockProduct: Product = {
    id: 'prod-1',
    name: 'Cahier A4',
    description: 'Cahier 96 pages',
    price: 3.5,
    compareAtPrice: 4.0,
    stockQuantity: 100,
    category: 'cahiers',
    imageUrl: 'https://example.com/cahier.jpg',
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
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductsService,
        { provide: getRepositoryToken(Product), useValue: repository },
      ],
    }).compile();

    service = module.get<ProductsService>(ProductsService);
  });

  describe('findAll', () => {
    it('devrait retourner les produits actifs paginés', async () => {
      repository.findAndCount!.mockResolvedValue([[mockProduct], 1]);

      const result = await service.findAll({});

      expect(repository.findAndCount).toHaveBeenCalledWith({
        where: { isActive: true },
        skip: 0,
        take: 20,
        order: { createdAt: 'DESC' },
      });
      expect(result).toEqual({ data: [mockProduct], total: 1 });
    });

    it('devrait filtrer par catégorie', async () => {
      repository.findAndCount!.mockResolvedValue([[mockProduct], 1]);

      await service.findAll({ category: 'cahiers' });

      expect(repository.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { isActive: true, category: 'cahiers' },
        }),
      );
    });

    it('devrait filtrer par recherche avec ILike', async () => {
      repository.findAndCount!.mockResolvedValue([[mockProduct], 1]);

      await service.findAll({ search: 'cahier' });

      expect(repository.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { isActive: true, name: ILike('%cahier%') },
        }),
      );
    });

    it('devrait paginer correctement', async () => {
      repository.findAndCount!.mockResolvedValue([[], 0]);

      await service.findAll({ page: 3, limit: 5 });

      expect(repository.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 10,
          take: 5,
        }),
      );
    });
  });

  describe('findById', () => {
    it('devrait retourner un produit par ID', async () => {
      repository.findOne!.mockResolvedValue(mockProduct);

      const result = await service.findById('prod-1');

      expect(result).toEqual(mockProduct);
    });

    it('devrait lever NotFoundException si produit introuvable', async () => {
      repository.findOne!.mockResolvedValue(null);

      await expect(service.findById('unknown')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('create', () => {
    it('devrait créer et sauvegarder un produit', async () => {
      const dto = { name: 'Stylo', price: 1.5 };
      repository.create!.mockReturnValue({ ...mockProduct, ...dto } as Product);
      repository.save!.mockResolvedValue({ ...mockProduct, ...dto } as Product);

      const result = await service.create(dto as any);

      expect(repository.create).toHaveBeenCalledWith(dto);
      expect(repository.save).toHaveBeenCalled();
      expect(result.name).toBe('Stylo');
    });
  });

  describe('update', () => {
    it('devrait mettre à jour un produit existant', async () => {
      const updated = { ...mockProduct, name: 'Cahier A5' };
      repository.findOne!.mockResolvedValue(mockProduct);
      repository.save!.mockResolvedValue(updated);

      const result = await service.update('prod-1', { name: 'Cahier A5' } as any);

      expect(result.name).toBe('Cahier A5');
    });

    it('devrait lever NotFoundException si produit introuvable', async () => {
      repository.findOne!.mockResolvedValue(null);

      await expect(
        service.update('unknown', { name: 'Test' } as any),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('devrait désactiver un produit (soft-delete)', async () => {
      repository.findOne!.mockResolvedValue({ ...mockProduct });
      repository.save!.mockResolvedValue({ ...mockProduct, isActive: false });

      await service.remove('prod-1');

      expect(repository.save).toHaveBeenCalledWith(
        expect.objectContaining({ isActive: false }),
      );
    });

    it('devrait lever NotFoundException si produit introuvable', async () => {
      repository.findOne!.mockResolvedValue(null);

      await expect(service.remove('unknown')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
