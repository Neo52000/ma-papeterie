import { Test, TestingModule } from '@nestjs/testing';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';

describe('ProductsController', () => {
  let controller: ProductsController;
  let productsService: jest.Mocked<Partial<ProductsService>>;

  const mockProduct = {
    id: 'prod-1',
    name: 'Cahier A4',
    price: 3.5,
    isActive: true,
  };

  beforeEach(async () => {
    productsService = {
      findAll: jest.fn().mockResolvedValue({ data: [mockProduct], total: 1 }),
      findById: jest.fn().mockResolvedValue(mockProduct),
      create: jest.fn().mockResolvedValue(mockProduct),
      update: jest.fn().mockResolvedValue({ ...mockProduct, name: 'Updated' }),
      remove: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProductsController],
      providers: [{ provide: ProductsService, useValue: productsService }],
    }).compile();

    controller = module.get<ProductsController>(ProductsController);
  });

  describe('GET /products', () => {
    it('devrait lister les produits avec pagination par défaut', async () => {
      const result = await controller.findAll();

      expect(productsService.findAll).toHaveBeenCalledWith({
        page: undefined,
        limit: undefined,
        category: undefined,
        search: undefined,
      });
      expect(result).toEqual({ data: [mockProduct], total: 1 });
    });

    it('devrait parser les query params', async () => {
      await controller.findAll('2', '10', 'cahiers', 'test');

      expect(productsService.findAll).toHaveBeenCalledWith({
        page: 2,
        limit: 10,
        category: 'cahiers',
        search: 'test',
      });
    });
  });

  describe('GET /products/:id', () => {
    it('devrait retourner un produit par ID', async () => {
      const result = await controller.findOne('prod-1');

      expect(productsService.findById).toHaveBeenCalledWith('prod-1');
      expect(result).toEqual(mockProduct);
    });
  });

  describe('POST /products', () => {
    it('devrait créer un produit', async () => {
      const dto = { name: 'Stylo', price: 1.5 };
      const result = await controller.create(dto as any);

      expect(productsService.create).toHaveBeenCalledWith(dto);
      expect(result).toEqual(mockProduct);
    });
  });

  describe('PATCH /products/:id', () => {
    it('devrait mettre à jour un produit', async () => {
      const dto = { name: 'Updated' };
      const result = await controller.update('prod-1', dto as any);

      expect(productsService.update).toHaveBeenCalledWith('prod-1', dto);
      expect(result!.name).toBe('Updated');
    });
  });

  describe('DELETE /products/:id', () => {
    it('devrait supprimer (désactiver) un produit', async () => {
      await controller.remove('prod-1');

      expect(productsService.remove).toHaveBeenCalledWith('prod-1');
    });
  });
});
