import appStylesHref from "./styles/fast-cod-pro.css?url";
import type { LinksFunction } from "react-router";
import { Links, Meta, Outlet, Scripts, ScrollRestoration } from "react-router";

export const links: LinksFunction = () => [
  { rel: "stylesheet", href: appStylesHref },
];

export default function App() {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        <meta
          name="description"
          content="Fast COD Pro is a Shopify embedded app for fast cash-on-delivery forms, Shopify order creation, and COD order management."
        />
        <Meta />
        <Links />
      </head>
      <body>
        <Outlet />
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}
