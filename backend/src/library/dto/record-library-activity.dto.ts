import { IsIn, IsString, MinLength } from 'class-validator';

export class RecordLibraryActivityDto {
  @IsString()
  @MinLength(1)
  discordUserId: string;

  /** Discord 메시지 ID 또는 thread:{threadId} 형태 */
  @IsString()
  @MinLength(1)
  sourceId: string;

  @IsIn(['message', 'thread'])
  kind: 'message' | 'thread';

  /** Discord에서 발생한 시각 (ISO) */
  @IsString()
  @MinLength(1)
  occurredAt: string;
}
