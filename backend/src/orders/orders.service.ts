import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, In } from 'typeorm';
import { Order, OrderStatus } from './order.entity';
import { CreateOrderDto } from './dto/create-order.dto';
import { Product } from '../products/product.entity';

@Injectable()
export class OrdersService {
  constructor(
    @InjectRepository(Order)
    private readonly ordersRepository: Repository<Order>,
    @InjectRepository(Product)
    private readonly productsRepository: Repository<Product>,
    private readonly dataSource: DataSource,
  ) {}

  async create(userId: string, dto: CreateOrderDto): Promise<Order> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Batch load all products in a single query (fixes N+1)
      const productIds = dto.items.map((item) => item.productId);
      const allProducts = await this.productsRepository.findBy({
        id: In(productIds),
      });
      const productMap = new Map(allProducts.map((p) => [p.id, p]));

      // Verify stock availability for each item
      const updates: { product: Product; quantity: number }[] = [];
      for (const item of dto.items) {
        const product = productMap.get(item.productId);
        if (!product) {
          throw new NotFoundException(`Produit introuvable : ${item.productId}`);
        }

        if (product.stockQuantity < item.quantity) {
          throw new BadRequestException(
            `Stock insuffisant pour le produit "${product.name}" (disponible: ${product.stockQuantity}, demandé: ${item.quantity})`,
          );
        }

        updates.push({ product, quantity: item.quantity });
      }

      // Calculate total
      const total = dto.items.reduce(
        (sum, item) => sum + item.price * item.quantity,
        0,
      );

      // Create the order
      const order = this.ordersRepository.create({
        userId,
        items: dto.items,
        total: parseFloat(total.toFixed(2)),
        shippingAddress: dto.shippingAddress,
      });

      const savedOrder = await queryRunner.manager.save(order);

      // Batch decrement stock (single save instead of N saves)
      for (const { product, quantity } of updates) {
        product.stockQuantity -= quantity;
      }
      await queryRunner.manager.save(updates.map((u) => u.product));

      await queryRunner.commitTransaction();
      return savedOrder;
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  async findByUser(
    userId: string,
    page = 1,
    limit = 20,
  ): Promise<{ data: Order[]; total: number }> {
    const [data, total] = await this.ordersRepository.findAndCount({
      where: { userId },
      skip: (page - 1) * limit,
      take: limit,
      order: { createdAt: 'DESC' },
    });
    return { data, total };
  }

  async findById(id: string, userId?: string): Promise<Order> {
    const where: Record<string, string> = { id };
    if (userId) where.userId = userId;

    const order = await this.ordersRepository.findOne({ where });
    if (!order) throw new NotFoundException('Order not found');
    return order;
  }

  async findAll(page = 1, limit = 20): Promise<{ data: Order[]; total: number }> {
    const [data, total] = await this.ordersRepository.findAndCount({
      skip: (page - 1) * limit,
      take: limit,
      order: { createdAt: 'DESC' },
    });
    return { data, total };
  }

  async updateStatus(id: string, status: OrderStatus): Promise<Order> {
    const order = await this.findById(id);
    order.status = status;
    return this.ordersRepository.save(order);
  }
}
