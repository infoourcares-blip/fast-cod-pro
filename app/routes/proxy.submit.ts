import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";

function wantsJson(request: Request) {
  const accept = request.headers.get("accept") || "";
  return accept.includes("application/json") || request.headers.get("x-requested-with") === "XMLHttpRequest";
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function storefrontResponse(request: Request, payload: Record<string, unknown>, status = 409) {
  if (wantsJson(request)) {
    return Response.json(payload, { status });
  }

  const message = escapeHtml(String(payload.message || "Please complete the order in Shopify Checkout."));

  return new Response(
    `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Use Shopify Checkout</title>
    <style>
      body{margin:0;min-height:100vh;display:grid;place-items:center;background:#f3f7fb;font-family:Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#0f172a}
      .card{width:min(92vw,520px);background:#fff;border:1px solid #dbe4ef;border-radius:24px;padding:32px;box-shadow:0 24px 70px rgba(15,23,42,.12);text-align:center}
      .icon{width:64px;height:64px;border-radius:999px;margin:0 auto 18px;display:grid;place-items:center;background:#e0f2fe;color:#0369a1;font-size:34px;font-weight:900}
      h1{margin:0 0 10px;font-size:30px;line-height:1.08}
      p{margin:0;color:#475569;font-size:17px;line-height:1.55}
      a{display:inline-flex;margin-top:24px;padding:14px 18px;border-radius:14px;background:#111827;color:#fff;text-decoration:none;font-weight:800}
    </style>
  </head>
  <body>
    <main class="card">
      <div class="icon">✓</div>
      <h1>Use Shopify Checkout</h1>
      <p>${message}</p>
      <a href="/checkout">Open checkout</a>
    </main>
  </body>
</html>`,
    {
      status,
      headers: { "Content-Type": "text/html; charset=utf-8" }
    }
  );
}

function checkoutOnlyResponse(request: Request) {
  return storefrontResponse(request, {
    error: "Fast COD Pro uses Shopify Checkout and no longer creates orders or draft orders through the app proxy.",
    message: "Add the product to cart and complete the order in secure Shopify Checkout.",
    checkoutRequired: true,
    orderCreated: false
  });
}

export const loader = async ({ request }: LoaderFunctionArgs) => {
  return checkoutOnlyResponse(request);
};

export const action = async ({ request }: ActionFunctionArgs) => {
  return checkoutOnlyResponse(request);
};
