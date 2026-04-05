import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Min,
  MinLength,
  ValidateIf,
} from 'class-validator';
import {
  BoogiOutCostMode,
  BoogiOutSettlementMode,
  BoogiOutTimeMode,
} from '@prisma/client';

export class CreateBoogiOutDto {
  @IsString()
  @MinLength(1)
  title!: string;

  @IsString()
  @MinLength(1)
  description!: string;

  @IsString()
  @MinLength(1)
  location!: string;

  @IsEnum(BoogiOutCostMode)
  costMode!: BoogiOutCostMode;

  @IsInt()
  @Min(0)
  costAmount!: number;

  @IsEnum(BoogiOutSettlementMode)
  settlementMode!: BoogiOutSettlementMode;

  /** 예상 가격 계산용 수요 인원 (총액÷수요인원) */
  @IsInt()
  @Min(1)
  demandParticipants!: number;

  @ValidateIf((o) => o.settlementMode === 'COMMISSION')
  @IsString()
  @MinLength(1)
  commissionBankName?: string;

  @ValidateIf((o) => o.settlementMode === 'COMMISSION')
  @IsString()
  @MinLength(1)
  commissionAccountNumber?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  maxParticipants?: number;

  @IsEnum(BoogiOutTimeMode)
  timeMode!: BoogiOutTimeMode;

  /** ISO 8601 — timeMode CONFIRMED일 때 필수 */
  @ValidateIf((o) => o.timeMode === 'CONFIRMED')
  @IsString()
  eventDate?: string;

  @ValidateIf((o) => o.timeMode === 'SET_TOGETHER')
  @IsOptional()
  @IsInt()
  @Min(1)
  targetHeadcount?: number;

  @ValidateIf((o) => o.timeMode === 'SET_TOGETHER')
  @IsOptional()
  @IsString()
  dateSelectionMockupUrl?: string;

  @IsBoolean()
  applicantResponseEnabled!: boolean;

  @ValidateIf((o) => o.applicantResponseEnabled === true)
  @IsString()
  @MinLength(1)
  applicantResponseLabel?: string;

  @IsBoolean()
  afterPartyEnabled!: boolean;

  @ValidateIf((o) => o.afterPartyEnabled === true)
  @IsInt()
  @Min(0)
  afterPartyBudgetPerPerson?: number;

  @IsOptional()
  @IsString()
  promotionalImageUrl?: string;
}
