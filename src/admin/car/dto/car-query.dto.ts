import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export const CAR_SORTS = ['plate', 'owner', 'apartment', 'createdAt'] as const;
export type CarSort = (typeof CAR_SORTS)[number];

/** Search, order and page of a building's cars */
export class AdminCarQueryDto {
  @ApiPropertyOptional({
    description:
      'Matches plate (ignoring spaces and dashes), owner name or email, apartment, phone and description',
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  q?: string;

  @ApiPropertyOptional({ minimum: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ minimum: 1, maximum: 100, default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number;

  @ApiPropertyOptional({ enum: CAR_SORTS, default: 'plate' })
  @IsOptional()
  @IsIn(CAR_SORTS)
  sort?: CarSort;

  @ApiPropertyOptional({ enum: ['asc', 'desc'], default: 'asc' })
  @IsOptional()
  @IsIn(['asc', 'desc'])
  dir?: 'asc' | 'desc';
}
