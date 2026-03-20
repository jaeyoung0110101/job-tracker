export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: 'URL required' });

  try {
    const pageRes = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0' }
    });
    const html = await pageRes.text();
    const text = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').slice(0, 8000);

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        messages: [{
          role: 'user',
          content: `다음 채용공고 텍스트에서 정보를 추출해서 JSON으로만 답해줘. 다른 말은 하지 마. 마크다운 코드블록도 쓰지 마.
형식: {"company":"기업명","position":"직무/포지션","category":"공기업|금융/컨설팅|IT/플랫폼|무역/물류|기타 중 하나","deadline":"YYYY-MM-DD 형식, 없으면 빈문자열","note":"부서/근무지/기간 등 핵심 정보 한줄","link":"${url}"}

텍스트: ${text}`
        }]
      })
    });

    const data = await response.json();
    console.log('API response:', JSON.stringify(data));
    
    if (!data.content || !data.content[0]) {
      throw new Error('API 응답 오류: ' + JSON.stringify(data));
    }
    
    const resultText = data.content[0].text.trim();
    const json = JSON.parse(resultText);
    res.status(200).json(json);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
}
