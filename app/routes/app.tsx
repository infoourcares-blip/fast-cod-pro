import type { HeadersFunction, LoaderFunctionArgs } from "react-router";
import { NavLink, Outlet, useLoaderData, useRouteError } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { AppProvider } from "@shopify/shopify-app-react-router/react";

import { authenticate } from "../shopify.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  await authenticate.admin(request);

  // eslint-disable-next-line no-undef
  return { apiKey: process.env.SHOPIFY_API_KEY || "" };
};

export default function App() {
  const { apiKey } = useLoaderData<typeof loader>();
  const links = [
    { to: "/app", label: "Dashboard", level: "primary", icon: "dashboard" },
    { to: "/app/builder", label: "Form Builder", level: "secondary", icon: "form" },
    { to: "/app/settings", label: "Form Settings", level: "secondary", icon: "settings" },
    { to: "/app/offers", label: "Upsell / Downsell", level: "secondary", icon: "sales" },
    { to: "/app/analytics", label: "Analytics", level: "secondary", icon: "analytics" },
    { to: "/app/abandoned", label: "Abandoned Orders", level: "secondary", icon: "queue" },
    { to: "/app/fraud", label: "Fraud Protection", level: "secondary", icon: "shield" },
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
