import { Test, TestingModule } from '@nestjs/testing';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { OrderStatus } from './order.entity';

describe('OrdersController', () => {
  let controller: OrdersController;
  let ordersService: jest.Mocked<Partial<OrdersService>>;

  const mockOrder = {
    id: 'order-1',
    userId: 'user-1',
    items: [{ productId: 'p1', name: 'Cahier', price: 3.5, quantity: 2 }],
    total: 7.0,
    status: OrderStatus.PENDING,
  };

  const mockReq = { user: { sub: 'user-1', email: 'test@example.com', role: 'user' } };

  beforeEach(async () => {
    ordersService = {
      create: jest.fn().mockResolvedValue(mockOrder),
      findByUser: jest.fn().mockResolvedValue({ data: [mockOrder], total: 1 }),
      findAll: jest.fn().mockResolvedValue({ data: [mockOrder], total: 1 }),
      findById: jest.fn().mockResolvedValue(mockOrder),
      updateStatus: jest.fn().mockResolvedValue({
        ...mockOrder,
        status: OrderStatus.CONFIRMED,
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [OrdersController],
      providers: [{ provide: OrdersService, useValue: ordersService }],
    }).compile();

    controller = module.get<OrdersController>(OrdersController);
  });

  describe('POST /orders', () => {
    it('devrait créer une commande avec le userId du token', async () => {
      const dto = {
        items: [{ productId: 'p1', name: 'Cahier', price: 3.5, quantity: 2 }],
      };
      const result = await controller.create(mockReq as any, dto as any);

      expect(ordersService.create).toHaveBeenCalledWith('user-1', dto);
      expect(result).toEqual(mockOrder);
    });
  });

  describe('GET /orders', () => {
    it('devrait retourner les commandes de l\'utilisateur', async () => {
      const result = await controller.findMyOrders(mockReq as any);

      expect(ordersService.findByUser).toHaveBeenCalledWith('user-1', 1, 20);
      expect(result).toEqual({ data: [mockOrder], total: 1 });
    });

    it('devrait parser page et limit', async () => {
      await controller.findMyOrders(mockReq as any, '2', '10');

      expect(ordersService.findByUser).toHaveBeenCalledWith('user-1', 2, 10);
    });
  });

  describe('GET /orders/admin', () => {
    it('devrait retourner toutes les commandes (admin)', async () => {
      const result = await controller.findAll();

      expect(ordersService.findAll).toHaveBeenCalledWith(1, 20);
      expect(result).toEqual({ data: [mockOrder], total: 1 });
    });

    it('devrait parser page et limit', async () => {
      await controller.findAll('3', '5');

      expect(ordersService.findAll).toHaveBeenCalledWith(3, 5);
    });
  });

  describe('GET /orders/:id', () => {
    it('devrait retourner une commande avec vérification userId', async () => {
      const result = await controller.findOne(mockReq as any, 'order-1');

      expect(ordersService.findById).toHaveBeenCalledWith('order-1', 'user-1');
      expect(result).toEqual(mockOrder);
    });
  });

  describe('PATCH /orders/:id/status', () => {
    it('devrait mettre à jour le statut (admin)', async () => {
      const result = await controller.updateStatus(
        'order-1',
        { status: OrderStatus.CONFIRMED },
      );

      expect(ordersService.updateStatus).toHaveBeenCalledWith(
        'order-1',
        OrderStatus.CONFIRMED,
      );
      expect(result.status).toBe(OrderStatus.CONFIRMED);
    });
  });
});
