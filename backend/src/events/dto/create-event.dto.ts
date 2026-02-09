export class CreateEventDto {
  title: string;
  content?: string;
  date: string; // ISO date string
  location: string;
  eventType?: 'MEETING' | 'DIGGING_CLUB' | 'ONLINE' | 'OTHER';
  maxParticipants: number;
  currentParticipants?: number;
  requiredCoins?: number;
}
