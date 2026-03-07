import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { Order, OrderStatus } from './order.entity';
import { ProductsService } from '../products/products.service';

describe('OrdersService', () => {
  let service: OrdersService;
  let repository: jest.Mocked<Partial<Repository<Order>>>;
  let productsService: jest.Mocked<Partial<ProductsService>>;
  let mockQueryRunner: any;
  let dataSource: jest.Mocked<Partial<DataSource>>;

  const mockOrder: Order = {
    id: 'order-1',
    userId: 'user-1',
    user: null as any,
    items: [
      { productId: 'p1', name: 'Cahier', price: 3.5, quantity: 2 },
      { productId: 'p2', name: 'Stylo', price: 1.0, quantity: 3 },
    ],
    total: 10.0,
    status: OrderStatus.PENDING,
    shippingAddress: '1 rue Test',
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

    productsService = {
      findById: jest.fn(),
    };

    mockQueryRunner = {
      connect: jest.fn(),
      startTransaction: jest.fn(),
      commitTransaction: jest.fn(),
      rollbackTransaction: jest.fn(),
      release: jest.fn(),
      manager: {
        save: jest.fn(),
      },
    };

    dataSource = {
      createQueryRunner: jest.fn().mockReturnValue(mockQueryRunner),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersService,
        { provide: getRepositoryToken(Order), useValue: repository },
        { provide: ProductsService, useValue: productsService },
        { provide: DataSource, useValue: dataSource },
      ],
    }).compile();

    service = module.get<OrdersService>(OrdersService);
  });

  describe('create', () => {
    it('devrait créer une commande et décrémenter le stock', async () => {
      const dto = {
        items: [
          { productId: 'p1', name: 'Cahier', price: 3.5, quantity: 2 },
          { productId: 'p2', name: 'Stylo', price: 1.0, quantity: 3 },
        ],
        shippingAddress: '1 rue Test',
      };

      const mockProduct1 = { id: 'p1', name: 'Cahier', stockQuantity: 10 };
      const mockProduct2 = { id: 'p2', name: 'Stylo', stockQuantity: 5 };

      productsService.findById!
        .mockResolvedValueOnce(mockProduct1 as any)
        .mockResolvedValueOnce(mockProduct2 as any);

      repository.create!.mockReturnValue(mockOrder);
      mockQueryRunner.manager.save.mockResolvedValue(mockOrder);

      const result = await service.create('user-1', dto);

      expect(repository.create).toHaveBeenCalledWith({
        userId: 'user-1',
        items: dto.items,
        total: 10.0, // 3.5*2 + 1.0*3
        shippingAddress: '1 rue Test',
      });
      expect(result).toEqual(mockOrder);
      expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.release).toHaveBeenCalled();

      // Verify stock was decremented
      expect(mockProduct1.stockQuantity).toBe(8); // 10 - 2
      expect(mockProduct2.stockQuantity).toBe(2); // 5 - 3
    });

    it('devrait lever BadRequestException si le stock est insuffisant', async () => {
      const dto = {
        items: [
          { productId: 'p1', name: 'Cahier', price: 3.5, quantity: 10 },
        ],
        shippingAddress: '1 rue Test',
      };

      const mockProduct = { id: 'p1', name: 'Cahier', stockQuantity: 3 };
      productsService.findById!.mockResolvedValueOnce(mockProduct as any);

      await expect(service.create('user-1', dto)).rejects.toThrow(
        BadRequestException,
      );
      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.release).toHaveBeenCalled();
    });

    it('devrait rejeter les produits avec un stock à 0', async () => {
      const dto = {
        items: [
          { productId: 'p1', name: 'Cahier', price: 3.5, quantity: 1 },
        ],
        shippingAddress: '1 rue Test',
      };

      const mockProduct = { id: 'p1', name: 'Cahier', stockQuantity: 0 };
      productsService.findById!.mockResolvedValueOnce(mockProduct as any);

      await expect(service.create('user-1', dto)).rejects.toThrow(
        BadRequestException,
      );
      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
    });

    it('devrait arrondir le total à 2 décimales', async () => {
      const dto = {
        items: [
          { productId: 'p1', name: 'Item', price: 1.333, quantity: 3 },
        ],
      };

      const mockProduct = { id: 'p1', name: 'Item', stockQuantity: 100 };
      productsService.findById!.mockResolvedValueOnce(mockProduct as any);

      repository.create!.mockReturnValue(mockOrder);
      mockQueryRunner.manager.save.mockResolvedValue(mockOrder);

      await service.create('user-1', dto);

      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({ total: 4.0 }), // parseFloat((1.333*3).toFixed(2)) = 4.0
      );
    });
  });

  describe('findByUser', () => {
    it('devrait retourner les commandes paginées d\'un utilisateur', async () => {
      repository.findAndCount!.mockResolvedValue([[mockOrder], 1]);

      const result = await service.findByUser('user-1', 1, 20);

      expect(repository.findAndCount).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        skip: 0,
        take: 20,
        order: { createdAt: 'DESC' },
      });
      expect(result).toEqual({ data: [mockOrder], total: 1 });
    });

    it('devrait paginer correctement pour page 2', async () => {
      repository.findAndCount!.mockResolvedValue([[], 0]);

      await service.findByUser('user-1', 2, 5);

      expect(repository.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 5, take: 5 }),
      );
    });
  });

  describe('findById', () => {
    it('devrait retourner une commande par ID', async () => {
      repository.findOne!.mockResolvedValue(mockOrder);

      const result = await service.findById('order-1');

      expect(repository.findOne).toHaveBeenCalledWith({
        where: { id: 'order-1' },
      });
      expect(result).toEqual(mockOrder);
    });

    it('devrait filtrer par userId si fourni', async () => {
      repository.findOne!.mockResolvedValue(mockOrder);

      await service.findById('order-1', 'user-1');

      expect(repository.findOne).toHaveBeenCalledWith({
        where: { id: 'order-1', userId: 'user-1' },
      });
    });

    it('devrait lever NotFoundException si commande introuvable', async () => {
      repository.findOne!.mockResolvedValue(null);

      await expect(service.findById('unknown')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findAll', () => {
    it('devrait retourner toutes les commandes paginées', async () => {
      repository.findAndCount!.mockResolvedValue([[mockOrder], 1]);

      const result = await service.findAll(1, 20);

      expect(repository.findAndCount).toHaveBeenCalledWith({
        skip: 0,
        take: 20,
        order: { createdAt: 'DESC' },
      });
      expect(result).toEqual({ data: [mockOrder], total: 1 });
    });
  });

  describe('updateStatus', () => {
    it('devrait mettre à jour le statut d\'une commande', async () => {
      const updated = { ...mockOrder, status: OrderStatus.CONFIRMED };
      repository.findOne!.mockResolvedValue({ ...mockOrder });
      repository.save!.mockResolvedValue(updated);

      const result = await service.updateStatus('order-1', OrderStatus.CONFIRMED);

      expect(repository.save).toHaveBeenCalledWith(
        expect.objectContaining({ status: OrderStatus.CONFIRMED }),
      );
      expect(result.status).toBe(OrderStatus.CONFIRMED);
    });

    it('devrait lever NotFoundException si commande introuvable', async () => {
      repository.findOne!.mockResolvedValue(null);

      await expect(
        service.updateStatus('unknown', OrderStatus.CONFIRMED),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
