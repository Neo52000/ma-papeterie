import { IsEnum } from 'class-validator';
import { OrderStatus } from '../order.entity';

export class UpdateOrderStatusDto {
  @IsEnum(OrderStatus, {
    message: `Le statut doit être l'un de : ${Object.values(OrderStatus).join(', ')}`,
  })
  status: OrderStatus;
}
