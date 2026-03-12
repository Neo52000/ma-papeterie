import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum UserRole {
  ADMIN = 'admin',
  PRO = 'pro',
  USER = 'user',
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column({ select: false })
  password: string;

  @Column({ nullable: true, length: 100 })
  firstName: string;

  @Column({ nullable: true, length: 100 })
  lastName: string;

  @Column({ type: 'enum', enum: UserRole, default: UserRole.USER })
  role: UserRole;

  @Column({ default: true })
  isActive: boolean;

  @Column({ nullable: true, select: false })
  resetPasswordToken: string | null;

  @Column({ type: 'timestamp', nullable: true, select: false })
  resetPasswordExpires: Date | null;

  @Column({ default: false })
  emailVerified: boolean;

  @Column({ nullable: true, select: false })
  emailVerificationToken: string | null;

  @Column({ nullable: true, select: false })
  refreshTokenHash: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
