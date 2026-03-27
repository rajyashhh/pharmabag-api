import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as https from 'https';
import { IdfyVerificationResponseDto } from './dto/idfy-pan.dto';
import { IdfyGstVerificationResponseDto } from './dto/idfy-gst.dto';

interface IdfyConfig {
  accountId: string;
  apiKey: string;
  taskId: string;
  groupId: string;
  baseUrl: string;
}

const MAX_RETRIES = 3;
const TIMEOUT_MS = 10_000;

@Injectable()
export class IdfyService {
  private readonly logger = new Logger(IdfyService.name);
  private readonly config: IdfyConfig | null;

  constructor(private readonly configService: ConfigService) {
    const accountId = this.configService.get<string>('IDFY_ACCOUNT_ID');
    const apiKey = this.configService.get<string>('IDFY_API_KEY');

    if (accountId && apiKey) {
      this.config = {
        accountId,
        apiKey,
        taskId: this.configService.get<string>(
          'IDFY_TASK_ID',
          '74f4c926-250c-43ca-9c53-453e87ceacd1',
        ),
        groupId: this.configService.get<string>(
          'IDFY_GROUP_ID',
          '8e16424a-58fc-4ba4-ab20-5bc8e7c3c41e',
        ),
        baseUrl: 'https://eve.idfy.com/v3/tasks/sync/verify_with_source',
      };
      this.logger.log('IDFY service initialized (credentials configured)');
    } else {
      this.config = null;
      this.logger.warn(
        'IDFY service NOT configured — IDFY_ACCOUNT_ID / IDFY_API_KEY missing. Verification will be skipped.',
      );
    }
  }

  /** Returns true when IDFY credentials are present */
  isConfigured(): boolean {
    return this.config !== null;
  }

  // ─────────────────────────────────────────────────
  // PAN VERIFICATION
  // ─────────────────────────────────────────────────

  async verifyPan(panNumber: string): Promise<IdfyVerificationResponseDto> {
    if (!this.config) {
      return { status: false, message: 'IDFY service not configured' };
    }

    const url = `${this.config.baseUrl}/ind_pan`;
    const payload = {
      task_id: this.config.taskId,
      group_id: this.config.groupId,
      data: { id_number: panNumber },
    };

    const response = await this.requestWithRetry(url, payload);
    return this.parsePanResponse(response, panNumber);
  }

  // ─────────────────────────────────────────────────
  // GST VERIFICATION
  // ─────────────────────────────────────────────────

  async verifyGst(
    gstNumber: string,
  ): Promise<IdfyGstVerificationResponseDto> {
    if (!this.config) {
      return { status: false, message: 'IDFY service not configured' };
    }

    const url = `${this.config.baseUrl}/ind_gst_certificate`;
    const payload = {
      task_id: this.config.taskId,
      group_id: this.config.groupId,
      data: { gstin: gstNumber },
    };

    const response = await this.requestWithRetry(url, payload);
    return this.parseGstResponse(response, gstNumber);
  }

  // ─────────────────────────────────────────────────
  // HTTP REQUEST WITH EXPONENTIAL-BACKOFF RETRIES
  // 3 attempts: delays 1 s → 2 s → 4 s
  // ─────────────────────────────────────────────────

  private async requestWithRetry(
    url: string,
    payload: Record<string, any>,
  ): Promise<any> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        return await this.makeHttpsRequest(url, payload);
      } catch (err: any) {
        lastError = err;
        this.logger.warn(
          `IDFY request failed (attempt ${attempt + 1}/${MAX_RETRIES}): ${err.message}`,
        );

        if (attempt < MAX_RETRIES - 1) {
          const delayMs = 1000 * Math.pow(2, attempt); // 1 s, 2 s, 4 s
          await this.delay(delayMs);
        }
      }
    }

    // All retries exhausted — return null so callers produce a failure DTO
    this.logger.error(
      `IDFY request failed after ${MAX_RETRIES} attempts: ${lastError?.message}`,
    );
    return null;
  }

  // ─────────────────────────────────────────────────
  // LOW-LEVEL HTTPS CALL  (Node built-in — no extra dep)
  // ─────────────────────────────────────────────────

  private makeHttpsRequest(
    url: string,
    payload: Record<string, any>,
  ): Promise<any> {
    return new Promise((resolve, reject) => {
      const body = JSON.stringify(payload);
      const parsedUrl = new URL(url);

      const options: https.RequestOptions = {
        hostname: parsedUrl.hostname,
        path: parsedUrl.pathname,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(body),
          'account-id': this.config!.accountId,
          'api-key': this.config!.apiKey,
        },
        timeout: TIMEOUT_MS,
      };

      const req = https.request(options, (res) => {
        const chunks: Buffer[] = [];
        res.on('data', (chunk: Buffer) => chunks.push(chunk));
        res.on('end', () => {
          const raw = Buffer.concat(chunks).toString('utf-8');

          if (res.statusCode && (res.statusCode < 200 || res.statusCode >= 300)) {
            return reject(
              new Error(`IDFY API HTTP ${res.statusCode}: ${raw.slice(0, 200)}`),
            );
          }

          try {
            resolve(JSON.parse(raw));
          } catch {
            reject(new Error(`Failed to parse IDFY response: ${raw.slice(0, 200)}`));
          }
        });
      });

      req.on('error', reject);
      req.on('timeout', () => {
        req.destroy();
        reject(new Error(`IDFY API request timed out after ${TIMEOUT_MS}ms`));
      });

      req.write(body);
      req.end();
    });
  }

  // ─────────────────────────────────────────────────
  // RESPONSE PARSERS  (legacy-compatible format)
  // ─────────────────────────────────────────────────

  private parsePanResponse(
    response: any,
    panNumber: string,
  ): IdfyVerificationResponseDto {
    if (!response || response.status !== 'completed') {
      return { status: false, message: 'Pan Number is invalid' };
    }

    const src = response.result?.source_output;
    const legalName =
      src?.name_on_card ?? src?.legal_name ?? src?.name ?? '';

    return {
      status: true,
      legalName,
      gstNumber: panNumber, // legacy stores PAN in gst_number field
      message: 'Pan Number is valid',
    };
  }

  private parseGstResponse(
    response: any,
    gstNumber: string,
  ): IdfyGstVerificationResponseDto {
    if (!response || response.status !== 'completed') {
      return { status: false, message: 'GST Number is invalid' };
    }

    const src = response.result?.source_output;

    return {
      status: true,
      legalName: src?.legal_name ?? '',
      gstNumber,
      natureOfBusinessActivity: src?.nature_of_business_activity ?? '',
      address:
        src?.principal_place_of_business_fields
          ?.principal_place_of_business_address ?? '',
      message: 'GST Number is valid',
    };
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
