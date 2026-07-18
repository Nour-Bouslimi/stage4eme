import {
  Controller,
  Post,
  UseGuards,
  Req,
  Body,
  Get,
  Param,
} from '@nestjs/common';
import { RatingsService } from './ratings.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CreateRatingDto } from './dto/create-rating.dto';

@Controller('ratings')
export class RatingsController {
  constructor(private ratingsService: RatingsService) {}

  @UseGuards(JwtAuthGuard)
  @Get(':livreurId/summary')
  async getSummary(@Param('livreurId') livreurId: string) {
    return this.ratingsService.getRatingSummaryByLivreur(livreurId);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':livreurId/count')
  async getTotalCount(@Param('livreurId') livreurId: string) {
    return this.ratingsService.getTotalRatingsCountByLivreur(livreurId);
  }

  @UseGuards(JwtAuthGuard)
  @Post()
  async create(@Req() req: any, @Body() dto: CreateRatingDto) {
    return this.ratingsService.createRating(req.user.id, dto);
  }
}
