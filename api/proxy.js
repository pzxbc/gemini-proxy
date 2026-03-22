// api/proxy.js
export const config = {
  runtime: 'edge',
  regions: ['iad1'], // 强制锁定美国华盛顿节点
};

export default async function (req) {
  const url = new URL(req.url);
  const targetHost = "generativeai.googleapis.com";

  // 1. 提取路径和参数 (确保冒号不被转义)
  const actualPath = url.pathname.replace(/%3A/g, ':');
  const targetUrl = `https://${targetHost}${actualPath}${url.search}`;

  // 2. 彻底手动构建 Headers，绝不克隆原始 req.headers
  const cleanHeaders = new Headers();
  
  // 提取 API Key (从 URL 参数或 x-goog-api-key 头部)
  const apiKey = url.searchParams.get("key") || req.headers.get("x-goog-api-key");
  if (apiKey) {
    cleanHeaders.set("x-goog-api-key", apiKey);
  }

  // 这里的关键：不设置 Host 头部，fetch 会根据 targetUrl 自动填入正确的 Host
  if (req.method === "POST") {
    cleanHeaders.set("Content-Type", "application/json");
  }

  // 模拟一个标准的浏览器 User-Agent，增加通过率
  cleanHeaders.set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36");

  try {
    // 3. 使用字符串 URL 发起请求
    const response = await fetch(targetUrl, {
      method: req.method,
      headers: cleanHeaders,
      body: req.method === "POST" ? await req.text() : null,
      redirect: 'follow'
    });

    // 4. 返回响应，添加跨域头以便调试
    const resHeaders = new Headers(response.headers);
    resHeaders.set("Access-Control-Allow-Origin", "*");
    
    return new Response(response.body, {
      status: response.status,
      headers: resHeaders,
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: "Proxy Error", message: e.message }), { 
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}