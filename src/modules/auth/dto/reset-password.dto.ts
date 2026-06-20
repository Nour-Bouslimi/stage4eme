import { Transform } from 'class-transformer';
import { IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';

export class ResetPasswordDto {
  @IsString()
  @IsNotEmpty()
  token: string;

  @IsString()
  @IsNotEmpty()
  @Transform(({ value, obj }) => obj.password ?? obj.newPassword ?? obj.motDePasse ?? value)
  @MinLength(8)
  motDePasse: string;

  @IsOptional()
  @IsString()
  confirmPassword?: string;

  @IsOptional()
  @IsString()
  passwordConfirmation?: string;
}
