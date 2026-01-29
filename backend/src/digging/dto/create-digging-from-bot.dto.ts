export class CreateDiggingFromBotDto {
  url: string;
  title?: string;
  description: string;
  hashtags?: string[];
  discordId?: string;
}
