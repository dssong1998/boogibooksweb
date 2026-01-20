export class CreateEventDto {
  title: string;
  content?: string;
  date: string; // ISO date string
  location: string;
  maxParticipants: number;
  currentParticipants?: number;
  requiredCoins?: number;
}
