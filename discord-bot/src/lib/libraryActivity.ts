/**
 * 백엔드 events.service.ts checkLibraryActivity 의 isValidMessage 와 동일한 규칙
 */
export function isValidLibraryMessage(content: string | undefined): boolean {
  if (!content) return false;

  if (content.length >= 1000) return true;

  const cleanedContent = content
    .replace(/[\u{1F600}-\u{1F64F}]/gu, '')
    .replace(/[\u{1F300}-\u{1F5FF}]/gu, '')
    .replace(/[\u{1F680}-\u{1F6FF}]/gu, '')
    .replace(/[\u{2600}-\u{26FF}]/gu, '')
    .replace(/[\u{2700}-\u{27BF}]/gu, '')
    .replace(/[<>[\]{}()#*_~`|\\!@$%^&+=:;'",.?/-]/g, '')
    .trim();

  const prefixRegex = /^(preview|review|프리뷰|리뷰)/i;
  return prefixRegex.test(cleanedContent);
}

export function getLibraryParentChannelId(): string | undefined {
  return (
    process.env.LIBRARY_CHANNEL_ID || process.env.BOOKS_CHANNEL_ID
  )?.trim() || undefined;
}
