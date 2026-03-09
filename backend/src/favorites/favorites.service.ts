import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Favorite } from './favorite.entity';

@Injectable()
export class FavoritesService {
  constructor(
    @InjectRepository(Favorite)
    private readonly favoritesRepository: Repository<Favorite>,
  ) {}

  async toggle(
    userId: string,
    productId: string,
  ): Promise<{ favorited: boolean }> {
    const existing = await this.favoritesRepository.findOne({
      where: { userId, productId },
    });

    if (existing) {
      await this.favoritesRepository.remove(existing);
      return { favorited: false };
    }

    const favorite = this.favoritesRepository.create({ userId, productId });
    await this.favoritesRepository.save(favorite);
    return { favorited: true };
  }

  async findByUser(
    userId: string,
    page = 1,
    limit = 20,
  ): Promise<{ data: Favorite[]; total: number }> {
    const [data, total] = await this.favoritesRepository.findAndCount({
      where: { userId },
      relations: ['product'],
      skip: (page - 1) * limit,
      take: limit,
      order: { createdAt: 'DESC' },
    });

    return { data, total };
  }

  async isFavorited(userId: string, productId: string): Promise<boolean> {
    const count = await this.favoritesRepository.count({
      where: { userId, productId },
    });
    return count > 0;
  }
}
