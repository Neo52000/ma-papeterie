import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, LessThanOrEqual } from 'typeorm';
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

  let mockQueryBuilder: Record<string, jest.Mock>;

  beforeEach(async () => {
    mockQueryBuilder = {
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn().mockResolvedValue([[mockProduct], 1]),
    };

    repository = {
      findOne: jest.fn(),
      find: jest.fn(),
      findAndCount: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder) as any,
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
      const result = await service.findAll({});

      expect(repository.createQueryBuilder).toHaveBeenCalledWith('product');
      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        'product.isActive = :isActive',
        { isActive: true },
      );
      expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith(
        'product.createdAt',
        'DESC',
      );
      expect(mockQueryBuilder.skip).toHaveBeenCalledWith(0);
      expect(mockQueryBuilder.take).toHaveBeenCalledWith(20);
      expect(result).toEqual({ data: [mockProduct], total: 1 });
    });

    it('devrait filtrer par catégorie', async () => {
      await service.findAll({ category: 'cahiers' });

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'product.category = :category',
        { category: 'cahiers' },
      );
    });

    it('devrait filtrer par recherche full-text', async () => {
      await service.findAll({ search: 'cahier' });

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        "to_tsvector('french', product.name || ' ' || COALESCE(product.description, '') || ' ' || COALESCE(product.category, '')) @@ plainto_tsquery('french', :search)",
        { search: 'cahier' },
      );
    });

    it('devrait paginer correctement', async () => {
      mockQueryBuilder.getManyAndCount.mockResolvedValue([[], 0]);

      await service.findAll({ page: 3, limit: 5 });

      expect(mockQueryBuilder.skip).toHaveBeenCalledWith(10);
      expect(mockQueryBuilder.take).toHaveBeenCalledWith(5);
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

  describe('findLowStock', () => {
    it('devrait retourner les produits avec un stock faible', async () => {
      const lowStockProducts = [
        { ...mockProduct, stockQuantity: 2 },
        { ...mockProduct, id: 'prod-2', stockQuantity: 5 },
      ];
      (repository.find as jest.Mock).mockResolvedValue(lowStockProducts);

      const result = await service.findLowStock(5);

      expect(repository.find).toHaveBeenCalledWith({
        where: {
          stockQuantity: LessThanOrEqual(5),
          isActive: true,
        },
        order: { stockQuantity: 'ASC' },
      });
      expect(result).toEqual(lowStockProducts);
      expect(result).toHaveLength(2);
    });

    it('devrait utiliser le seuil par défaut de 5', async () => {
      (repository.find as jest.Mock).mockResolvedValue([]);

      await service.findLowStock();

      expect(repository.find).toHaveBeenCalledWith({
        where: {
          stockQuantity: LessThanOrEqual(5),
          isActive: true,
        },
        order: { stockQuantity: 'ASC' },
      });
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
