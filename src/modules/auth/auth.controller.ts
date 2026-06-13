import { Controller, Post, Body, UseGuards, Req } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { InscriptionClientDto } from './dto/inscription-client.dto';
import { UsersService } from '../users/users.service';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService, private usersService: UsersService) {}

  @Post('register')
  async register(@Body() dto: InscriptionClientDto) {
    return this.authService.registerClient(dto);
  }

  @Post('login')
  async login(@Body() dto: LoginDto) {
    const user = await this.authService.validateUser(dto.email, dto.motDePasse);
    if (!user) return { error: 'Invalid credentials' };
    return this.authService.login(user);
  }

  @Post('register-admin')
  async registerAdmin(@Body() body: any) {
    const { secret, ...dto } = body;
    return this.authService.registerAdmin(dto as InscriptionClientDto, secret);
  }
}
