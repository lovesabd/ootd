export const config = { runtime: 'edge' };

export default async function handler(req) {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST',
        'Access-Control-Allow-Headers': 'Content-Type',
      }
    });
  }

  const body = await req.json();
  const { closet, profile, occasion, weather, targetScore, mood } = body;

  const closetDesc = closet.map(item =>
    `- ${item.name || item.cn} (${item.cat}, ${item.cn}색, 착용 ${item.wc || 0}회)`
  ).join('\n');

  const prompt = `당신은 40대 남성 전문 스타일리스트입니다. 아래 정보를 바탕으로 오늘의 코디를 추천해주세요.

## 사용자 정보
- 체형: ${profile.body || '표준형'}, 키: ${profile.h || 175}cm
- 얼굴형: ${profile.face || '타원형'}
- 퍼스널 컬러: ${profile.pc || '웜톤'}
- 선호 스타일: ${(profile.styles || ['비즈니스 캐주얼']).join(', ')}

## 오늘 상황
- 자리: ${occasion}
- 날씨: ${weather ? `${weather.temp}°C, ${weather.desc}` : '정보 없음'}
- 목표 완성도: ${targetScore}% 이상
- 무드: ${mood || '단정하게'}

## 등록된 옷장 (${closet.length}벌)
${closetDesc}

## 요청사항
위 옷장 아이템만 사용해서 오늘 상황에 맞는 최적 코디를 구성하세요.
없는 옷은 절대 추천하지 마세요.

반드시 아래 JSON 형식으로만 응답하세요 (다른 텍스트 없이):
{
  "title": "코디 제목",
  "score": 점수(숫자),
  "scores": { "color": 점수, "fit": 점수, "weather": 점수, "tpo": 점수, "accessory": 점수 },
  "selectedItems": ["옷장에 있는 아이템 이름1", "아이템 이름2"],
  "missing": [{"cat": "카테고리", "reason": "이유", "effect": "완성도 +N%"}],
  "advice": "스타일 해설 2-3문장",
  "tip": "완성도를 올리는 팁 한 줄"
}`;

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1000,
      messages: [{ role: 'user', content: prompt }]
    })
  });

  const data = await response.json();
  const text = data.content?.[0]?.text || '';
  const clean = text.replace(/```json|```/g, '').trim();

  return new Response(clean, {
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    }
  });
}
