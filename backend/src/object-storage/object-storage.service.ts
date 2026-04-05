import {
  BadRequestException,
  Injectable,
  ServiceUnavailableException,
  InternalServerErrorException,
} from '@nestjs/common';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { randomUUID } from 'crypto';
import * as dotenv from 'dotenv';
dotenv.config();

const MAX_BYTES = 8 * 1024 * 1024; // 8MB

function sanitizeFilename(name: string): string {
  const base = (name || 'image').split(/[/\\]/).pop() || 'image';
  return base.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 120);
}

function extFromMime(mime: string): string {
  const m: Record<string, string> = {
    'image/jpeg': '.jpg',
    'image/png': '.png',
    'image/webp': '.webp',
    'image/gif': '.gif',
  };
  return m[mime] || '';
}

@Injectable()
export class ObjectStorageService {
  private client: S3Client | null = null;

  isConfigured(): boolean {
    return Boolean(
      process.env.VULTR_OBJECT_STORAGE_ENDPOINT &&
      process.env.VULTR_OBJECT_STORAGE_BUCKET &&
      process.env.VULTR_OBJECT_STORAGE_ACCESS_KEY &&
      process.env.VULTR_OBJECT_STORAGE_SECRET_KEY,
    );
  }

  private getS3(): S3Client {
    if (!this.isConfigured()) {
      throw new ServiceUnavailableException(
        'Vultr Object Storage 환경 변수가 설정되지 않았습니다.',
      );
    }
    if (!this.client) {
      const region = process.env.VULTR_OBJECT_STORAGE_REGION || 'ewr1';
      const endpoint = process.env.VULTR_OBJECT_STORAGE_ENDPOINT!.replace(
        /\/$/,
        '',
      );
      this.client = new S3Client({
        region,
        endpoint,
        credentials: {
          accessKeyId: process.env.VULTR_OBJECT_STORAGE_ACCESS_KEY!,
          secretAccessKey: process.env.VULTR_OBJECT_STORAGE_SECRET_KEY!,
        },
        forcePathStyle: true,
      });
    }
    return this.client;
  }

  private buildPublicUrl(key: string): string {
    const explicit = process.env.VULTR_OBJECT_STORAGE_PUBLIC_BASE_URL?.replace(
      /\/$/,
      '',
    );
    if (explicit) {
      return `${explicit}/${key}`;
    }
    const endpoint = process.env.VULTR_OBJECT_STORAGE_ENDPOINT?.replace(
      /\/$/,
      '',
    );
    const bucket = process.env.VULTR_OBJECT_STORAGE_BUCKET;
    if (!endpoint || !bucket) {
      throw new InternalServerErrorException(
        'Object storage public URL을 만들 수 없습니다. VULTR_OBJECT_STORAGE_PUBLIC_BASE_URL을 설정하세요.',
      );
    }
    return `${endpoint}/${bucket}/${key}`;
  }

  /**
   * 이미지를 버킷에 올리고 브라우저에서 접근 가능한 공개 URL을 반환합니다.
   */
  async uploadPublicImage(input: {
    buffer: Buffer;
    contentType: string;
    originalName: string;
    folder?: string;
  }): Promise<string> {
    if (!input.buffer?.length) {
      throw new BadRequestException('빈 파일입니다.');
    }
    if (input.buffer.length > MAX_BYTES) {
      throw new BadRequestException(
        `파일은 최대 ${MAX_BYTES / 1024 / 1024}MB까지 업로드할 수 있습니다.`,
      );
    }

    const folder = (input.folder || 'boogi-out/promo').replace(
      /^\/+|\/+$/g,
      '',
    );
    const ext = extFromMime(input.contentType) || '.bin';
    const safe = sanitizeFilename(input.originalName);
    const key = `${folder}/${randomUUID()}-${safe}${safe.includes('.') ? '' : ext}`;

    const bucket = process.env.VULTR_OBJECT_STORAGE_BUCKET;
    const s3 = this.getS3();

    await s3.send(
      new PutObjectCommand({
        ACL: 'public-read',
        Bucket: bucket,
        Key: key,
        Body: input.buffer,
        ContentType: input.contentType,
        CacheControl: 'public, max-age=31536000',
      }),
    );

    return this.buildPublicUrl(key);
  }
}
