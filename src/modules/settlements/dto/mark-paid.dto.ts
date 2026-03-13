import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class MarkPaidDto {
  @ApiProperty({ example: 'PAY-REF-123456', description: 'Bank payout reference number' })
  @IsString()
  @IsNotEmpty({ message: 'Payout reference is required' })
  payoutReference: string;
}
