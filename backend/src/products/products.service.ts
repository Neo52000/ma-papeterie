import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThanOrEqual } from 'typeorm';
import { Product } from './product.entity';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product)
    private readonly productsRepository: Repository<Product>,
  ) {}

  async findAll(options: {
    page?: number;
    limit?: number;
    category?: string;
    search?: string;
  }): Promise<{ data: Product[]; total: number }> {
    const { page = 1, limit = 20, category, search } = options;

    const qb = this.productsRepository
      .createQueryBuilder('product')
      .where('product.isActive = :isActive', { isActive: true });

    if (category) {
      qb.andWhere('product.category = :category', { category });
    }

    if (search) {
      qb.andWhere(
        "to_tsvector('french', product.name || ' ' || COALESCE(product.description, '') || ' ' || COALESCE(product.category, '')) @@ plainto_tsquery('french', :search)",
        { search },
      );
    }

    qb.orderBy('product.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [data, total] = await qb.getManyAndCount();

    return { data, total };
  }

  async findById(id: string): Promise<Product> {
    const product = await this.productsRepository.findOne({ where: { id } });
    if (!product) throw new NotFoundException('Product not found');
    return product;
  }

  async create(dto: CreateProductDto): Promise<Product> {
    const product = this.productsRepository.create(dto);
    return this.productsRepository.save(product);
  }

  async update(id: string, dto: UpdateProductDto): Promise<Product> {
    const product = await this.findById(id);
    Object.assign(product, dto);
    return this.productsRepository.save(product);
  }

  async remove(id: string): Promise<void> {
    const product = await this.findById(id);
    product.isActive = false;
    await this.productsRepository.save(product);
  }

  async findLowStock(threshold: number = 5): Promise<Product[]> {
    return this.productsRepository.find({
      where: {
        stockQuantity: LessThanOrEqual(threshold),
        isActive: true,
      },
      order: { stockQuantity: 'ASC' },
    });
  }
}
