import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { URL } from 'url';
import * as http from 'http';
import * as https from 'https';
import {
  NimbusOtpRequestDto,
  NimbusOtpResponseDto,
  NimbusAuthDto,
  NimbusDataDto,
} from '../dto/nimbus-otp-request.dto';

@Injectable()
export class OtpSmsService {
  private readonly logger = new Logger(OtpSmsService.name);
  private readonly nimbusApiUrl: string;
  private readonly nimbusUser: string;
  private readonly nimbusKey: string;
  private readonly smsTemplateMessage: string;
  private readonly referenceId: string;
  private readonly entityId: string;
  private readonly templateId: string;
  private readonly sender: string;

  constructor(private readonly configService: ConfigService) {
    // Load Nimbus IT credentials from environment variables
    this.nimbusApiUrl =
      this.configService.get<string>('NIMBUS_API_URL') ||
      'http://nimbusit.info/api/pushsmsjson.php';
    this.nimbusUser =
      this.configService.get<string>('NIMBUS_USER') || 't5jaipharma';
    this.nimbusKey =
      this.configService.get<string>('NIMBUS_KEY') || '010Qftn20u6Y7M31aWNY';
    this.sender = this.configService.get<string>('NIMBUS_SENDER') || 'PHABAG';
    this.smsTemplateMessage =
      this.configService.get<string>('NIMBUS_OTP_MESSAGE') ||
      'Welcome to Pharmabag. Use OTP {otp} to login to your Pharmabag account';
    this.referenceId =
      this.configService.get<string>('NIMBUS_REFERENCE_ID') || '1564879';
    this.entityId =
      this.configService.get<string>('NIMBUS_ENTITY_ID') ||
      '1701163558888608648';
    this.templateId =
      this.configService.get<string>('NIMBUS_TEMPLATE_ID') ||
      '1707163835062147514';

    // Validate critical configuration
    if (!this.nimbusUser || !this.nimbusKey) {
      this.logger.warn(
        'Nimbus IT SMS credentials not fully configured. OTP sending will fail in production.',
      );
    }
  }

  /**
   * Send OTP via Nimbus IT SMS API
   * @param phoneNumber - 10-digit Indian phone number
   * @param otp - 6-digit OTP code
   * @returns Response from Nimbus IT API
   */
  async sendOtp(phoneNumber: string, otp: string): Promise<NimbusOtpResponseDto> {
    try {
      // Validate input
      if (!phoneNumber || !otp) {
        throw new HttpException(
          'Phone number and OTP are required',
          HttpStatus.BAD_REQUEST,
        );
      }

      // Ensure phone number is 10 digits
      const cleanPhone = phoneNumber.replace(/\D/g, '');
      if (cleanPhone.length !== 10) {
        throw new HttpException(
          'Invalid phone number format',
          HttpStatus.BAD_REQUEST,
        );
      }

      // Replace placeholder in message with actual OTP
      const message = this.smsTemplateMessage.replace('{otp}', otp);

      // Build request payload
      const payload: NimbusOtpRequestDto = {
        Authorization: {
          User: this.nimbusUser,
          Key: this.nimbusKey,
        },
        Data: {
          Sender: this.sender,
          Message: message,
          Flash: '0',
          ReferenceId: this.referenceId,
          EntityId: this.entityId,
          TemplateId: this.templateId,
          Mobile: [cleanPhone],
        },
      };

      this.logger.debug(
        `Sending OTP to ${cleanPhone} via Nimbus IT API`,
      );

      // Make HTTP POST request to Nimbus IT API
      const responseData = await this.makeHttpRequest(payload);

      // Log success
      this.logger.log(
        `OTP sent successfully to ${cleanPhone}. Response: ${JSON.stringify(responseData)}`,
      );

      return responseData;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      this.logger.error(`Error sending OTP: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw new HttpException(
        'Failed to send OTP. Please try again later.',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  }

  /**
   * Fallback method for development/testing - logs OTP without sending
   * @param phoneNumber - 10-digit Indian phone number
   * @param otp - 6-digit OTP code
   * @returns Mock response
   */
  logOtpForDevelopment(phoneNumber: string, otp: string): NimbusOtpResponseDto {
    this.logger.debug(`[DEV MODE] OTP for ${phoneNumber}: ${otp}`);
    return {
      status: 'success',
      message: 'OTP logged for development',
      referenceId: 'dev-' + Date.now(),
    };
  }

  /**
   * Check if SMS provider is properly configured
   * @returns true if credentials are available
   */
  isConfigured(): boolean {
    return !!(this.nimbusUser && this.nimbusKey);
  }

  /**
   * Get OTP message template (for validation purposes)
   * @returns Template message
   */
  getMessageTemplate(): string {
    return this.smsTemplateMessage;
  }

  /**
   * Helper method to make HTTP POST request to Nimbus IT API
   * @param payload - Request payload
   * @returns Parsed response from API
   */
  private makeHttpRequest(payload: NimbusOtpRequestDto): Promise<NimbusOtpResponseDto> {
    return new Promise((resolve, reject) => {
      const url = new URL(this.nimbusApiUrl);
      const isHttps = url.protocol === 'https:';
      const httpModule = isHttps ? https : http;

      const postData = JSON.stringify(payload);

      const options = {
        hostname: url.hostname,
        port: url.port,
        path: url.pathname + url.search,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData),
        },
      };

      const req = httpModule.request(options, (res) => {
        let data = '';

        res.on('data', (chunk) => {
          data += chunk;
        });

        res.on('end', () => {
          try {
            // Check HTTP status code
            if (!res.statusCode || res.statusCode >= 400) {
              this.logger.error(
                `Nimbus IT API error: HTTP ${res.statusCode} - ${data}`,
              );
              return reject(
                new HttpException(
                  `Failed to send OTP: HTTP ${res.statusCode}`,
                  HttpStatus.SERVICE_UNAVAILABLE,
                ),
              );
            }

            // Parse JSON response
            const responseData = JSON.parse(data) as NimbusOtpResponseDto;
            resolve(responseData);
          } catch (parseError) {
            this.logger.error(`Failed to parse Nimbus IT response: ${data}`);
            reject(
              new HttpException(
                'Invalid response from SMS provider',
                HttpStatus.SERVICE_UNAVAILABLE,
              ),
            );
          }
        });
      });

      req.on('error', (error) => {
        this.logger.error(`Nimbus IT API request error: ${error.message}`);
        reject(
          new HttpException(
            'Failed to send OTP. Please try again later.',
            HttpStatus.SERVICE_UNAVAILABLE,
          ),
        );
      });

      // Set request timeout
      req.setTimeout(10000, () => {
        req.destroy();
        reject(
          new HttpException(
            'SMS provider request timeout',
            HttpStatus.SERVICE_UNAVAILABLE,
          ),
        );
      });

      // Write payload
      req.write(postData);
      req.end();
    });
  }
}
