async function getMetaVanilla(url) {
  try {
    // 1. HTML 데이터 가져오기 (User-Agent는 봇 차단 방지용)
    const response = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0',
      },
    });
    const html = await response.text();

    // 2. 정규표현식을 이용한 추출 함수
    const extractMeta = (property) => {
      // <meta property="og:title" content="..." /> 형태를 찾는 정규식
      // content가 앞에 있든 뒤에 있든 대응하기 위해 유연하게 작성
      const regex = new RegExp(
        `<meta[^>]+property=["']${property}["'][^>]+content=["']([^"']+)["']`,
        'i',
      );
      const match = html.match(regex);

      // 만약 위 정규식으로 안 잡히면 (속성 순서가 바뀐 경우) 역순으로 한 번 더 체크
      if (!match) {
        const reverseRegex = new RegExp(
          `<meta[^>]+content=["']([^"']+)["'][^>]+property=["']${property}["']`,
          'i',
        );
        const reverseMatch = html.match(reverseRegex);
        return reverseMatch ? reverseMatch[1] : null;
      }

      return match[1];
    };

    // 3. 결과 객체 생성
    const ogData = {
      title: extractMeta('og:title'),
      image: extractMeta('og:image'),
      description: extractMeta('og:description'),
      url: extractMeta('og:url'),
    };

    console.log('--- Vanilla 추출 결과 ---');
    console.log(ogData);
    return ogData;
  } catch (error) {
    console.error('오류 발생:', error.message);
  }
}

const targetUrl = 'https://www.youtube.com/watch?v=cvTHTUWql94';
// getMetaVanilla(targetUrl);
console.log(targetUrl.match(/https?:\/\/[^\s]+/g));
