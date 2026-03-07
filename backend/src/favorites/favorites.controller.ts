import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  UseGuards,
  Request,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { FavoritesService } from './favorites.service';
import type { JwtPayloadRequest } from '../common/interfaces/jwt-payload.interface';

@ApiTags('favorites')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('favorites')
export class FavoritesController {
  constructor(private readonly favoritesService: FavoritesService) {}

  @Post(':productId')
  @ApiOperation({ summary: 'Ajouter/retirer un favori' })
  toggle(
    @Request() req: JwtPayloadRequest,
    @Param('productId', ParseUUIDPipe) productId: string,
  ) {
    return this.favoritesService.toggle(req.user.sub, productId);
  }

  @Get()
  @ApiOperation({ summary: 'Lister mes favoris' })
  findMyFavorites(
    @Request() req: JwtPayloadRequest,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.favoritesService.findByUser(
      req.user.sub,
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 20,
    );
  }

  @Get(':productId/check')
  @ApiOperation({ summary: 'Vérifier si un produit est en favori' })
  async check(
    @Request() req: JwtPayloadRequest,
    @Param('productId', ParseUUIDPipe) productId: string,
  ) {
    const favorited = await this.favoritesService.isFavorited(
      req.user.sub,
      productId,
    );
    return { favorited };
  }
}
