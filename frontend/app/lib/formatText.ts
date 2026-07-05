/** `<br>` 태그와 사용자 입력 줄바꿈을 plain text 표시용으로 정규화 */
export function formatMultilineText(text: string): string {
  return text
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/?b>/gi, '')
    .replace(/\r\n/g, '\n');
}
