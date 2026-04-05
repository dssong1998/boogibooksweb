import { IsInt, IsString, Min, MinLength } from 'class-validator';

export class AfterPartySettleDto {
  @IsInt()
  @Min(0)
  totalAmount!: number;

  @IsString()
  @MinLength(1)
  bankName!: string;

  @IsString()
  @MinLength(1)
  accountNumber!: string;
}
