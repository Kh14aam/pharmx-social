export async function onRequest(context) {
  // This handles all /api/* routes that aren't handled by Next.js
  return new Response(JSON.stringify({
    message: "Cloudflare Pages Function is working",
    path: context.request.url,
    timestamp: new Date().toISOString()
  }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json'
    }
  });
}
