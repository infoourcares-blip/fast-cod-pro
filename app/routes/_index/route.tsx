import type { LoaderFunctionArgs } from "react-router";
import { redirect, Form, useLoaderData } from "react-router";

import { login } from "../../shopify.server";

import styles from "./styles.module.css";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url);

  if (url.searchParams.get("shop")) {
    throw redirect(`/app?${url.searchParams.toString()}`);
  }

  return { showForm: Boolean(login) };
};

export default function App() {
  const { showForm } = useLoaderData<typeof loader>();

  return (
    <div className={styles.index}>
      <div className={styles.content}>
        <h1 className={styles.heading}>Fast COD Pro for high-converting COD stores</h1>
        <p className={styles.text}>
          Launch a fast cash-on-delivery form that creates Shopify Orders from product pages.
        </p>
        {showForm && (
          <Form className={styles.form} method="post" action="/auth/login">
            <label className={styles.label}>
              <span>Shop domain</span>
              <input className={styles.input} type="text" name="shop" />
              <span>e.g: my-shop-domain.myshopify.com</span>
            </label>
            <button className={styles.button} type="submit">
              Log in
            </button>
          </Form>
        )}
        <ul className={styles.list}>
          <li>
            <strong>COD popup button</strong>. Let shoppers place a COD request
            directly from the product page.
          </li>
          <li>
            <strong>Shopify order records</strong>. COD orders are created in
            Shopify with pending payment and native order status pages.
          </li>
          <li>
            <strong>Theme controls</strong>. Customize the button label, colors,
            icon, and animation from inside Shopify admin.
          </li>
        </ul>
      </div>
    </div>
  );
}
