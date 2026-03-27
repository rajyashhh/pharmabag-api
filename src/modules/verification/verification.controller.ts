import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { IdfyService } from './idfy.service';
import { VerifyGstPanDto, VerificationType } from './dto/verify-gst-pan.dto';
import { IdfyVerificationResponseDto } from './dto/idfy-pan.dto';
import { IdfyGstVerificationResponseDto } from './dto/idfy-gst.dto';

@ApiTags('Verification')
@Controller('verification')
export class VerificationController {
  constructor(private readonly idfyService: IdfyService) {}

  @Post('pangst')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify GST or PAN number via IDFY' })
  @ApiResponse({ status: 200, description: 'Verification result returned' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  async verifyGstPan(
    @Body() dto: VerifyGstPanDto,
  ): Promise<IdfyVerificationResponseDto | IdfyGstVerificationResponseDto> {
    if (!this.idfyService.isConfigured()) {
      throw new BadRequestException(
        'IDFY verification service is not configured',
      );
    }

    if (dto.type === VerificationType.PAN) {
      return this.idfyService.verifyPan(dto.value);
    }
    return this.idfyService.verifyGst(dto.value);
  }
}
