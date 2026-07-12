import { Controller, Post, Body, UseGuards, BadRequestException } from '@nestjs/common';
import { VehicleSuggestionService } from './vehicle-suggestion.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@Controller('vehicle-suggestion')
@UseGuards(JwtAuthGuard)
export class VehicleSuggestionController {
  constructor(private readonly service: VehicleSuggestionService) {}

  @Post()
  async suggest(@Body('description') description: string) {
    if (!description || description.trim().length < 5) {
      throw new BadRequestException('Description trop courte (minimum 5 caractères)');
    }
    return this.service.suggestVehicle(description.trim());
  }
}