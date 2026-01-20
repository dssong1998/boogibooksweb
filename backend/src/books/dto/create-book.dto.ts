export class CreateBookDto {
  title: string;
  author: string;
  isbn?: string;
  publisher?: string;
  coverUrl?: string;
  description?: string;
}
