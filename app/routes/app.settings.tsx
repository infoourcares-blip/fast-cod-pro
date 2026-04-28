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
    <s-page heading="Form Settings">
      <div className="proShell">
        <section className="proHero proHeroCompact">
          <div>
            <span className="proEyebrow">Form behavior</span>
            <h1>Control how the fast COD form appears and converts.</h1>
            <p>Choose button style, brand defaults, OTP behavior, and high-converting layout options from one beginner-friendly screen.</p>
          </div>
          <button type="button" className="proButton">Enable Fast COD Form</button>
        </section>

        <div className="proGridTwo">
          <section className="proCard">
            <div className="proCardHeader">
              <div>
                <h2>Button and layout</h2>
                <p>Use sticky or floating buttons for mobile-first conversion.</p>
              </div>
            </div>
            <div className="proSegmented">
              <button type="button" className="proSegmentActive">Floating</button>
              <button type="button">Inline</button>
              <button type="button">Sticky bar</button>
            </div>
            <div className="proForm">
              <label className="proField">
                <span>Form layout</span>
                <select defaultValue="drawer">
                  <option value="drawer">Slide drawer</option>
                  <option value="popup">Centered popup</option>
                  <option value="inline">Inline form</option>
                </select>
              </label>
              <label className="proField">
                <span>Spacing</span>
                <input type="range" min="8" max="28" defaultValue="16" />
              </label>
              <label className="proField">
                <span>Font</span>
                <select defaultValue="inter">
                  <option value="inter">Inter / system</option>
                  <option value="sf">SF Pro style</option>
                </select>
              </label>
            </div>
          </section>

          <section className="proCard">
            <div className="proCardHeader">
              <div>
                <h2>Brand controls</h2>
                <p>Logo, color, and contact settings used across the app.</p>
              </div>
            </div>
            <Form method="post" className="proForm">
              <label className="proField">
                <span>Brand name</span>
                <input name="brandName" defaultValue={profile.brandName} />
              </label>
              <div className="proFieldGrid">
                <label className="proField">
                  <span>Default currency</span>
                  <input name="defaultCurrency" defaultValue={profile.defaultCurrency} />
                </label>
                <label className="proField">
                  <span>Fraud shield level</span>
                  <select name="fraudShieldLevel" defaultValue={profile.fraudShieldLevel}>
                    <option value="light">Light</option>
                    <option value="balanced">Balanced</option>
                    <option value="strict">Strict</option>
                  </select>
                </label>
              </div>
              <label className="proField">
                <span>Support email</span>
                <input name="supportEmail" defaultValue={profile.supportEmail} />
              </label>
              <label className="proField">
                <span>Support WhatsApp</span>
                <input name="supportWhatsapp" defaultValue={profile.supportWhatsapp ?? ""} placeholder="919876543210" />
              </label>
              <label className="proField">
                <span>Tutorial URL</span>
                <input name="tutorialUrl" defaultValue={profile.tutorialUrl} />
              </label>
              <label className="proCheck">
                <input type="checkbox" name="otpEnabled" defaultChecked={profile.otpEnabled} />
                <span>Enable WhatsApp OTP option</span>
              </label>
              <label className="proCheck">
                <input type="checkbox" name="upsellEnabled" defaultChecked={profile.upsellEnabled} />
                <span>Enable upsell engine by default</span>
              </label>
              <button type="submit" className="proButton">Save settings</button>
              {actionData ? (
                <span className={actionData.status === "success" ? "successText" : "errorText"}>
                  {actionData.message}
                </span>
              ) : null}
            </Form>
          </section>
        </div>

        <section className="proCard">
          <div className="proCardHeader">
            <div>
              <h2>Advanced customization</h2>
              <p>Add custom CSS and logo settings for premium brand control.</p>
            </div>
          </div>
          <div className="proForm">
            <label className="proField"><span>Logo URL</span><input placeholder="https://..." /></label>
            <label className="proField"><span>Custom CSS</span><textarea placeholder=".fast-cod-pro-button { ... }" /></label>
          </div>
        </section>
      </div>
    </s-page>
  );
}
