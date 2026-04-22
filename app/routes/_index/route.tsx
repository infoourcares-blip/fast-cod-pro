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
        <h1 className={styles.heading}>Fast Cod Pro for high-converting COD stores</h1>
        <p className={styles.text}>
          Launch an embedded Shopify app for COD forms, upsells, fraud checks,
          and automations that helps merchants increase conversion and AOV.
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
            <strong>Smart COD forms</strong>. Capture order intent faster with
            embedded or popup flows that reduce checkout friction.
          </li>
          <li>
            <strong>Revenue offers</strong>. Add post-form upsells, bundles,
            and quantity deals to lift average order value.
          </li>
          <li>
            <strong>Fraud control</strong>. Use OTP and risk rules to reduce
            fake COD orders before fulfillment.
          </li>
        </ul>
      </div>
    </div>
  );
}
