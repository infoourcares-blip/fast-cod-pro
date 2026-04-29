import type { LoaderFunctionArgs } from "react-router";

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url);
  const order = escapeHtml(url.searchParams.get("order") || "");

  return new Response(
    `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Order confirmed</title>
    <style>
      body{margin:0;min-height:100vh;display:grid;place-items:center;background:#f3f7fb;font-family:Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#0f172a}
      .card{width:min(92vw,520px);background:#fff;border:1px solid #dbe4ef;border-radius:24px;padding:34px;box-shadow:0 24px 70px rgba(15,23,42,.12);text-align:center}
      .icon{width:68px;height:68px;border-radius:999px;margin:0 auto 18px;display:grid;place-items:center;background:#dcfce7;color:#047857;font-size:36px;font-weight:900}
      h1{margin:0 0 10px;font-size:34px;line-height:1.08}
      p{margin:0;color:#475569;font-size:17px;line-height:1.55}
      .order{margin-top:16px;color:#0f172a;font-weight:900}
      a{display:inline-flex;margin-top:24px;padding:14px 18px;border-radius:14px;background:#111827;color:#fff;text-decoration:none;font-weight:800}
    </style>
  </head>
  <body>
    <main class="card">
      <div class="icon">✓</div>
      <h1>Thank you!</h1>
      <p>Your COD order has been confirmed.</p>
      ${order ? `<p class="order">Order ${order}</p>` : ""}
      <a href="/">Continue shopping</a>
    </main>
  </body>
</html>`,
    {
      headers: { "Content-Type": "text/html; charset=utf-8" }
    }
  );
};
