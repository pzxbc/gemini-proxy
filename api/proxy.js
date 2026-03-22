// api/proxy.js
export const config = {
  runtime: 'edge',   // 强制开启边缘运行时，性能更强，处理流更稳
  regions: ['iad1'], // 锁定美国东部，确保跳过香港节点的拦截
};

export default async function (req) {
  const url = new URL(req.url);
  const targetHost = "generativeai.googleapis.com";

  // 1. 构造精确的目标 URL
  // 确保路径中的冒号 :streamGenerateContent 不会被二次编码
  const actualPath = url.pathname.replace(/%3A/g, ':');
  const targetUrl = `https://${targetHost}${actualPath}${url.search}`;

  console.log("Targeting Google:", targetUrl);

  // 2. 构造纯净的 Headers
  const newHeaders = new Headers(req.headers);
  newHeaders.set("Host", targetHost);
  newHeaders.delete("Referer");
  newHeaders.delete("Origin");
  
  // 确保 Content-Type 正确
  if (req.method === "POST") {
    newHeaders.set("Content-Type", "application/json");
  }

  // 3. 直接透明转发请求流
  try {
    const response = await fetch(targetUrl, {
      method: req.method,
      headers: newHeaders,
      body: req.method === "POST" ? await req.text() : null,
      redirect: 'follow'
    });

    // 4. 克隆响应头并添加跨域支持
    const responseHeaders = new Headers(response.headers);
    responseHeaders.set("Access-Control-Allow-Origin", "*");

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), { 
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}