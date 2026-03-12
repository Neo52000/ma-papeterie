import {
  IsArray,
  IsString,
  IsNumber,
  IsOptional,
  IsNotEmpty,
  IsUUID,
  ValidateNested,
  Min,
  Max,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';

class OrderItemDto {
  @IsUUID()
  @IsNotEmpty()
  productId: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @IsNumber()
  @Min(0.01)
  @Max(999999)
  price: number;

  @IsNumber()
  @Min(1)
  @Max(9999)
  quantity: number;
}

export class CreateOrderDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items: OrderItemDto[];

  @IsString()
  @IsOptional()
  @MaxLength(500)
  shippingAddress?: string;
}
