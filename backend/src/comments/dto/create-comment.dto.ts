export class CreateCommentDto {
  bookId: string;
  type?: 'PREVIEW' | 'REVIEW' | 'QUOTE';
  content: string;
  page?: number;
}
