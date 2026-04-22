import { Prisma } from "@prisma/client";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { Form, useActionData, useLoaderData } from "react-router";
import { getFunnelProfile } from "../lib/funnel.server";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";

type ActionData = {
  status: "success" | "error";
  message: string;
} | null;

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const profile = await getFunnelProfile(session.shop);
  return { profile };
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const formData = await request.formData();

  const brandName = String(formData.get("brandName") || "").trim();
  const defaultCurrency = String(formData.get("defaultCurrency") || "USD").trim();
  const supportEmail = String(formData.get("supportEmail") || "").trim();
  const supportWhatsapp = String(formData.get("supportWhatsapp") || "").trim();
  const tutorialUrl = String(formData.get("tutorialUrl") || "").trim();
  const fraudShieldLevel = String(formData.get("fraudShieldLevel") || "balanced").trim();
  const otpEnabled = formData.get("otpEnabled") === "on";
  const upsellEnabled = formData.get("upsellEnabled") === "on";

  if (!brandName || !supportEmail || !tutorialUrl) {
    return {
      status: "error" as const,
      message: "Brand name, support email, and tutorial URL are required."
    };
  }

  await prisma.funnelProfile.update({
    where: { shop: session.shop },
    data: {
      brandName,
      defaultCurrency,
      supportEmail,
      supportWhatsapp: supportWhatsapp || null,
      tutorialUrl,
      fraudShieldLevel,
      otpEnabled,
      upsellEnabled
    }
  });

  return {
    status: "success" as const,
    message: "Settings saved successfully."
  };
};

export default function SettingsRoute() {
  const { profile } = useLoaderData<typeof loader>();
  const actionData = useActionData<ActionData>();

  return (
    <s-page heading="Merchant Settings">
      <div className="shell">
        <section className="panel">
          <div className="panelHeader">
            <div>
              <p className="eyebrow">Configuration</p>
              <h2 className="panelTitle">Store-level Fast Cod Pro settings</h2>
              <p className="panelText">
                These values are stored in Prisma and control the brand, risk, and offer defaults for this merchant.
              </p>
            </div>
          </div>

          <Form method="post" className="formGrid">
            <label className="field">
              <span className="label">Brand name</span>
              <input className="input" name="brandName" defaultValue={profile.brandName} />
            </label>

            <label className="field">
              <span className="label">Default currency</span>
              <input className="input" name="defaultCurrency" defaultValue={profile.defaultCurrency} />
            </label>

            <label className="field">
              <span className="label">Support email</span>
              <input className="input" name="supportEmail" defaultValue={profile.supportEmail} />
            </label>

            <label className="field">
              <span className="label">Support WhatsApp</span>
              <input className="input" name="supportWhatsapp" defaultValue={profile.supportWhatsapp ?? ""} placeholder="919876543210" />
            </label>

            <label className="field">
              <span className="label">Tutorial URL</span>
              <input className="input" name="tutorialUrl" defaultValue={profile.tutorialUrl} />
            </label>

            <label className="field">
              <span className="label">Fraud shield level</span>
              <select className="input" name="fraudShieldLevel" defaultValue={profile.fraudShieldLevel}>
                <option value="light">Light</option>
                <option value="balanced">Balanced</option>
                <option value="strict">Strict</option>
              </select>
            </label>

            <label className="checkRow">
              <input type="checkbox" name="otpEnabled" defaultChecked={profile.otpEnabled} />
              <span>Enable OTP verification</span>
            </label>

            <label className="checkRow">
              <input type="checkbox" name="upsellEnabled" defaultChecked={profile.upsellEnabled} />
              <span>Enable upsell engine by default</span>
            </label>

            <div className="formActions">
              <button type="submit" className="primaryButton">Save settings</button>
              {actionData ? (
                <span className={actionData.status === "success" ? "successText" : "errorText"}>
                  {actionData.message}
                </span>
              ) : null}
            </div>
          </Form>
        </section>
      </div>
    </s-page>
  );
}
