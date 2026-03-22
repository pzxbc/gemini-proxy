// api/proxy.js
export const config = {
  runtime: 'edge',   // 使用边缘运行时，响应速度最快
  regions: ['iad1'], // 强制锁定美国华盛顿特区节点
};

export default async function (req) {
  const url = new URL(req.url);
  
  // 1. 切换到你测试成功的官方端点
  const targetHost = "generativelanguage.googleapis.com";

  // 2. 精准路径重构
  // 处理冒号问题，确保 :generateContent 不会被转义为 %3A
  const actualPath = url.pathname.replace(/%3A/g, ':');
  const targetUrl = `https://${targetHost}${actualPath}${url.search}`;

  // 3. 构建“净空”Headers，防止 Vercel/CF 的地理位置头暴露你的位置
  const cleanHeaders = new Headers();
  
  // 关键：不克隆原始 req.headers，只手动设置必要的
  cleanHeaders.set("Content-Type", "application/json");
  
  // 提取 API Key
  const apiKey = url.searchParams.get("key") || req.headers.get("x-goog-api-key");
  if (apiKey) {
    cleanHeaders.set("x-goog-api-key", apiKey);
  }

  // 模拟标准访问
  cleanHeaders.set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36");

  try {
    const response = await fetch(targetUrl, {
      method: req.method,
      headers: cleanHeaders,
      body: req.method === "POST" ? await req.text() : null,
      redirect: 'follow'
    });

    // 4. 返回响应并保留跨域头
    const resHeaders = new Headers(response.headers);
    resHeaders.set("Access-Control-Allow-Origin", "*");
    
    // 如果返回了非 JSON 内容（比如还是 404 HTML），我们直接透传以便观察
    return new Response(response.body, {
      status: response.status,
      headers: resHeaders,
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: "Edge Proxy Error", message: e.message }), { status: 500 });
  }
}