import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsInt,
  IsDateString,
  Min,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateProductDto {
  @ApiProperty({ example: 'Paracetamol 500mg', maxLength: 255 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @ApiProperty({ example: 'uuid-of-category' })
  @IsString()
  @IsNotEmpty()
  categoryId: string;

  @ApiProperty({ example: 'uuid-of-subcategory' })
  @IsString()
  @IsNotEmpty()
  subCategoryId: string;

  @ApiProperty({ example: 'Cipla Ltd', maxLength: 255 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  manufacturer: string;

  @ApiProperty({ example: 'Paracetamol IP 500mg' })
  @IsString()
  @IsNotEmpty()
  chemicalComposition: string;

  @ApiPropertyOptional({ example: 'Analgesic and antipyretic tablet' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ example: 25.50, description: 'MRP in INR' })
  @IsNumber()
  @Min(0)
  mrp: number;

  @ApiProperty({ example: 12, description: 'GST percentage' })
  @IsNumber()
  @Min(0)
  gstPercent: number;

  @ApiPropertyOptional({ example: 10, minimum: 1 })
  @IsInt()
  @Min(1)
  @IsOptional()
  minimumOrderQuantity?: number;

  @ApiPropertyOptional({ example: 1000, minimum: 1 })
  @IsInt()
  @Min(1)
  @IsOptional()
  maximumOrderQuantity?: number;

  @ApiProperty({ example: 500, description: 'Initial stock count' })
  @IsInt()
  @Min(0)
  stock: number;

  @ApiProperty({ example: '2026-12-31', description: 'ISO date string' })
  @IsDateString()
  expiryDate: string;
}
