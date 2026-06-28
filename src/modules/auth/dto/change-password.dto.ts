import { Transform } from 'class-transformer';
import { IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';

export class ChangePasswordDto {
  @IsString()
  @IsNotEmpty()
  @Transform(({ value, obj }) => obj.currentPassword ?? obj.oldPassword ?? obj.ancienMotDePasse ?? obj.motDePasseActuel ?? value)
  currentPassword: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(10)
  @Transform(({ value, obj }) => obj.newPassword ?? obj.nouveauMotDePasse ?? obj.motDePasse ?? obj.password ?? value)
  newPassword: string;

  @IsOptional()
  @IsString()
  confirmPassword?: string;

  @IsOptional()
  @IsString()
  passwordConfirmation?: string;
}
