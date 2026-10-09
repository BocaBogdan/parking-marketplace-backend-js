import { PartialType } from '@nestjs/swagger';
import { CreateCarDto } from './create-car.dto.js';

export class UpdateCarDto extends PartialType(CreateCarDto) {}
