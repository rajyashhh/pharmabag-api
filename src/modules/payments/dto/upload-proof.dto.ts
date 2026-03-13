import { IsNotEmpty, IsString, IsUrl } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UploadProofDto {
  @ApiProperty({ example: 'https://s3.amazonaws.com/proof.jpg', description: 'URL of the payment proof image' })
  @IsUrl({}, { message: 'proofUrl must be a valid URL' })
  @IsString()
  @IsNotEmpty({ message: 'proofUrl is required' })
  proofUrl: string;
}
