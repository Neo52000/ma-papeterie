import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Order, OrderStatus } from './order.entity';
import { CreateOrderDto } from './dto/create-order.dto';
import { ProductsService } from '../products/products.service';

@Injectable()
export class OrdersService {
  constructor(
    @InjectRepository(Order)
    private readonly ordersRepository: Repository<Order>,
    private readonly productsService: ProductsService,
    private readonly dataSource: DataSource,
  ) {}

  async create(userId: string, dto: CreateOrderDto): Promise<Order> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Verify stock availability for each item
      const products = [];
      for (const item of dto.items) {
        const product = await this.productsService.findById(item.productId);

        if (product.stockQuantity < item.quantity) {
          throw new BadRequestException(
            `Stock insuffisant pour le produit "${product.name}" (disponible: ${product.stockQuantity}, demandé: ${item.quantity})`,
          );
        }

        products.push({ product, quantity: item.quantity });
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

      // Decrement stock for each product
      for (const { product, quantity } of products) {
        product.stockQuantity -= quantity;
        await queryRunner.manager.save(product);
      }

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
