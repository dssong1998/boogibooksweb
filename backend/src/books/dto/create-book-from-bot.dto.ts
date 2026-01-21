export class CreateBookFromBotDto {
  title: string;
  author: string;
  isbn?: string;
  publisher?: string;
  coverUrl?: string;
  description?: string;
  discordId?: string;
}
