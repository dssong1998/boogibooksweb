export class Book {
  id: string;
  userId: string;
  title: string;
  author: string;
  isbn: string | null;
  publisher: string | null;
  coverUrl: string | null;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
}
