import {
  Controller,
  Get,
  Patch,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UsersService } from './users.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import type { JwtPayloadRequest } from '../common/interfaces/jwt-payload.interface';

@ApiTags('users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('users')
export class ProfileController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  @ApiOperation({ summary: 'Obtenir son propre profil' })
  getMyProfile(@Request() req: JwtPayloadRequest) {
    return this.usersService.findById(req.user.sub);
  }

  @Patch('me')
  @ApiOperation({ summary: 'Modifier son propre profil' })
  updateMyProfile(
    @Request() req: JwtPayloadRequest,
    @Body() data: UpdateProfileDto,
  ) {
    return this.usersService.update(req.user.sub, data);
  }
}
