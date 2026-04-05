import { IsString, MinLength } from 'class-validator';

export class ConfirmBoogiOutDateDto {
  /** ISO 8601 */
  @IsString()
  @MinLength(1)
  eventDate!: string;
}
