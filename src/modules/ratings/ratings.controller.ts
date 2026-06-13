import { Controller, Post, UseGuards, Req, Body } from '@nestjs/common';
import { RatingsService } from './ratings.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@Controller('ratings')
export class RatingsController {
  constructor(private ratingsService: RatingsService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  async create(@Req() req: any, @Body() dto: any) {
    return this.ratingsService.createRating(req.user.id, dto);
  }
}
