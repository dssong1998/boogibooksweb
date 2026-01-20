export enum UserRole {
  VISITOR = 'VISITOR',
  MEMBER = 'MEMBER',
  ADMIN = 'ADMIN',
}

export class User {
  id: string;
  discordId: string;
  username: string;
  email: string | null;
  role: UserRole;
  isTerras: boolean; // 테라스 멤버 여부
  coins: number;
  totalBooksRead: number;
  eventsParticipated: number;
  createdAt: Date;
  updatedAt: Date;
}
