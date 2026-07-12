import { Module } from '@nestjs/common';
import { VehicleSuggestionService } from './vehicle-suggestion.service';
import { VehicleSuggestionController } from './vehicle-suggestion.controller';

@Module({
  providers: [VehicleSuggestionService],
  controllers: [VehicleSuggestionController],
  exports: [VehicleSuggestionService],
})
export class VehicleSuggestionModule {}
