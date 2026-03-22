export default async function handler(req, res) {
  // 1. 构造目标 URL
  const targetHost = "generativeai.googleapis.com";
  const url = new URL(req.url, `https://${req.headers.host}`);
  const targetUrl = `https://${targetHost}${url.pathname}${url.search}`;

  // 2. 清理并构造 Header
  const headers = new Headers();
  // 复制原始请求中必要的 Header
  if (req.headers['content-type']) headers.set('Content-Type', req.headers['content-type']);
  if (req.headers['x-goog-api-key']) headers.set('x-goog-api-key', req.headers['x-goog-api-key']);
  
  // 强制设置 Host，这是避开 404 的关键
  headers.set("Host", targetHost);

  try {
    const response = await fetch(targetUrl, {
      method: req.method,
      headers: headers,
      body: req.method === 'POST' ? JSON.stringify(req.body) : null,
    });

    const data = await response.json();
    
    // 设置跨域并返回结果
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.status(response.status).json(data);
  } catch (error) {
    res.status(500).json({ error: "Proxy Error", message: error.message });
  }
}