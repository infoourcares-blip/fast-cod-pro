import type { HeadersFunction, LoaderFunctionArgs } from "react-router";
import { NavLink, Outlet, useLoaderData, useRouteError } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { AppProvider } from "@shopify/shopify-app-react-router/react";

import { authenticate, sessionStorage } from "../shopify.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);

  try {
    await sessionStorage.storeSession(session);
  } catch (error) {
    console.error("Fast COD Pro could not persist admin session", {
      shop: session.shop,
      error: error instanceof Error ? error.message : String(error)
    });
  }

  // eslint-disable-next-line no-undef
  return { apiKey: process.env.SHOPIFY_API_KEY || "" };
};

export default function App() {
  const { apiKey } = useLoaderData<typeof loader>();
  const whatsappSupportUrl =
    "https://wa.me/919718127346?text=Hi%20Fast%20COD%20Pro%20support%2C%20I%20need%20help%20with%20my%20Shopify%20app.";
  const links = [
    { to: "/app", label: "Dashboard", level: "primary", icon: "dashboard" },
    { to: "/app/builder", label: "COD Form", level: "secondary", icon: "form" },
    { to: "/app/submissions", label: "Orders Queue", level: "secondary", icon: "queue" },
    { to: "/app/billing", label: "Billing Plans", level: "secondary", icon: "billing" },
    { to: "/app/launch", label: "Launch Readiness", level: "secondary", icon: "launch" },
  ] as const;

  return (
    <AppProvider embedded apiKey={apiKey}>
      <div className="appFrame">
        <div className="appLayout">
          <aside className="sidebar">
            <div className="sidebarBrand">
              <div className="brandMark" aria-hidden="true">FC</div>
              <div>
                <div className="sidebarBrandTitle">Fast COD Pro</div>
                <div className="sidebarBrandSub">Conversion OS</div>
              </div>
            </div>
            <nav className="sideMenu">
              {links.map((link) => (
                <NavLink
                  key={`${link.to}-${link.label}`}
                  to={link.to}
                  className={({ isActive }) =>
                    [
                      "sideMenuLink",
                      link.level === "primary" ? "sideMenuLinkPrimary" : "sideMenuLinkSecondary",
                      isActive ? "sideMenuLinkActive" : "",
                    ].filter(Boolean).join(" ")
                  }
                  end={link.to === "/app"}
                >
                  <span className={`sideMenuIcon sideMenuIcon-${link.icon}`} aria-hidden="true" />
                  {link.label}
                </NavLink>
              ))}
            </nav>
          </aside>
          <div className="appContent">
            <Outlet />
          </div>
        </div>
        <a
          className="whatsappSupportButton"
          href={whatsappSupportUrl}
          target="_blank"
          rel="noreferrer"
          aria-label="Open WhatsApp support chat"
          title="WhatsApp support"
        >
          <span className="whatsappSupportPrompt">Hi, how may I help you?</span>
          <span className="whatsappSupportStatus" aria-hidden="true" />
          <span className="whatsappSupportIcon" aria-hidden="true">
            <svg viewBox="0 0 32 32" focusable="false" role="img">
              <path
                d="M16 4.4c-6.2 0-11.2 4.8-11.2 10.8 0 2.1.6 4.1 1.8 5.8L5.2 27l6.3-1.6c1.4.7 2.9 1.1 4.5 1.1 6.2 0 11.2-4.8 11.2-10.7S22.2 4.4 16 4.4Z"
              />
              <path
                d="M11.6 10.8c.3-.6.5-.7.9-.7h.7c.2 0 .5.1.7.5l.8 1.9c.1.3.2.6 0 .8l-.5.7c-.2.2-.3.4-.1.8.4.7 1.1 1.5 2 2.1.8.5 1.6.8 1.9.6.3-.3.7-.9.9-1.2.2-.3.5-.4.8-.2l2 1c.4.2.6.3.6.6.1.5-.1 1.4-.6 1.9-.5.6-1.4 1.1-2.5 1.1-1.3 0-3.2-.7-5.2-2.3-2.4-2-3.9-4.6-4-5.9 0-.7.3-1.2.7-1.7Z"
              />
            </svg>
          </span>
        </a>
      </div>
    </AppProvider>
  );
}

// Shopify needs React Router to catch some thrown responses, so that their headers are included in the response.
export function ErrorBoundary() {
  return boundary.error(useRouteError());
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
