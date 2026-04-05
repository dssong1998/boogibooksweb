import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class ApplyBoogiOutDto {
  @IsOptional()
  @IsString()
  responseText?: string;

  /** 이벤트에 뒷풀이가 켜져 있을 때 필수(서비스에서 검증) */
  @IsOptional()
  @IsBoolean()
  afterPartyOptIn?: boolean;
}
