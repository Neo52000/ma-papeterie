import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { UsersService } from '../users/users.service';
import { MailerService } from '../mailer/mailer.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { ChangePasswordDto } from './dto/change-password.dto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly mailerService: MailerService,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.usersService.findByEmail(dto.email);
    if (existing) {
      throw new ConflictException('Email already registered');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 12);

    const emailVerificationToken = crypto.randomBytes(32).toString('hex');

    const user = await this.usersService.create({
      email: dto.email,
      password: hashedPassword,
      firstName: dto.firstName,
      lastName: dto.lastName,
      emailVerificationToken,
    });

    await this.mailerService.sendVerificationEmail(dto.email, emailVerificationToken);

    const tokens = await this.generateTokens(user.id, user.email, user.role);

    return {
      user: { id: user.id, email: user.email, role: user.role },
      ...tokens,
    };
  }

  async login(dto: LoginDto) {
    const user = await this.usersService.findByEmailWithPassword(dto.email);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Account is disabled');
    }

    const passwordValid = await bcrypt.compare(dto.password, user.password);
    if (!passwordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const tokens = await this.generateTokens(user.id, user.email, user.role);

    return {
      user: { id: user.id, email: user.email, role: user.role },
      ...tokens,
    };
  }

  async refreshToken(userId: string, refreshToken: string) {
    const user = await this.usersService.findByIdWithRefreshToken(userId);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    if (!user.refreshTokenHash) {
      throw new UnauthorizedException('Refresh token invalid');
    }

    const isValid = await bcrypt.compare(refreshToken, user.refreshTokenHash);
    if (!isValid) {
      throw new UnauthorizedException('Refresh token invalid');
    }

    return this.generateTokens(user.id, user.email, user.role);
  }

  async logout(userId: string) {
    await this.usersService.update(userId, {
      refreshTokenHash: null as any,
    });

    return { message: 'Déconnexion réussie.' };
  }

  async getProfile(userId: string) {
    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return user;
  }

  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await this.usersService.findByIdWithPassword(userId);

    if (!user) {
      throw new UnauthorizedException('Utilisateur introuvable');
    }

    const isCurrentValid = await bcrypt.compare(dto.currentPassword, user.password);
    if (!isCurrentValid) {
      throw new BadRequestException('Le mot de passe actuel est incorrect');
    }

    const hashedPassword = await bcrypt.hash(dto.newPassword, 12);
    await this.usersService.update(userId, { password: hashedPassword });

    return { message: 'Mot de passe modifié avec succès.' };
  }

  async forgotPassword(dto: ForgotPasswordDto) {
    const user = await this.usersService.findByEmail(dto.email);

    if (user) {
      const resetToken = crypto.randomBytes(32).toString('hex');
      const resetExpires = new Date(Date.now() + 3600000); // 1 hour

      await this.usersService.update(user.id, {
        resetPasswordToken: resetToken,
        resetPasswordExpires: resetExpires,
      });

      await this.mailerService.sendResetPasswordEmail(dto.email, resetToken);
    }

    // Always return the same message to prevent email enumeration
    return { message: 'Si cet email existe, un lien de réinitialisation a été envoyé.' };
  }

  async resetPassword(dto: ResetPasswordDto) {
    const user = await this.usersService.findByResetToken(dto.token);
    if (!user) {
      throw new BadRequestException('Token invalide ou expiré');
    }

    const hashedPassword = await bcrypt.hash(dto.newPassword, 12);

    await this.usersService.update(user.id, {
      password: hashedPassword,
      resetPasswordToken: null as any,
      resetPasswordExpires: null as any,
    });

    return { message: 'Mot de passe réinitialisé avec succès.' };
  }

  async verifyEmail(dto: VerifyEmailDto) {
    const user = await this.usersService.findByVerificationToken(dto.token);
    if (!user) {
      throw new BadRequestException('Token de vérification invalide');
    }

    await this.usersService.update(user.id, {
      emailVerified: true,
      emailVerificationToken: null as any,
    });

    return { message: 'Email vérifié avec succès.' };
  }

  private async generateTokens(userId: string, email: string, role: string) {
    const payload = { sub: userId, email, role };

    const accessToken = this.jwtService.sign(payload, { expiresIn: '15m' });
    const refreshToken = this.jwtService.sign(payload, { expiresIn: '7d' });

    const refreshTokenHash = await bcrypt.hash(refreshToken, 10);
    await this.usersService.update(userId, { refreshTokenHash });

    return { accessToken, refreshToken };
  }
}
