import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';

export class CreateFeatureFlagDto {
  @ApiProperty({ example: 'SPOT_DOCUMENT_NOT_REQUIRED' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  @Matches(/^[A-Z][A-Z0-9_]*$/, {
    message: 'key must be UPPER_SNAKE_CASE',
  })
  key: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;
}
