import { IsString, IsEmail, IsOptional, IsEnum } from 'class-validator';
import { UserRole } from '../entities/user.entity';

export class CreateUserDto {
  @IsString()
  discordId: string;

  @IsString()
  username: string;

  @IsEmail()
  @IsOptional()
  email?: string | null;

  @IsEnum(UserRole)
  @IsOptional()
  role?: UserRole;
}
