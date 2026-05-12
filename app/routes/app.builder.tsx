import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { Form, Link, useActionData, useLoaderData } from "react-router";
import { useState } from "react";
import prisma from "../db.server";
import { getFunnelProfile } from "../lib/funnel.server";
import { authenticate } from "../shopify.server";

type ActionData = {
  status: "success" | "error";
  message: string;
} | null;

const defaultColors = {
  modalBgColor: "#ffffff",
  cardBgColor: "#f8fafc",
  textColor: "#0f172a",
  mutedTextColor: "#64748b",
  inputBgColor: "#ffffff",
  inputTextColor: "#0f172a",
  inputBorderColor: "#d9e2ec",
  summaryBgColor: "#eef6f4",
  headerBgColor: "#0f172a",
  headerTextColor: "#ffffff",
};

const launcherIconOptions = ["🛒", "📦", "💵", "🚚", "⚡", "🛍", "✅", ""];
const launcherAnimationOptions = [
  { label: "None", value: "none" },
  { label: "Shaker", value: "shaker" },
  { label: "Bounce", value: "bounce" },
  { label: "Pulse", value: "pulse" }
];

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const profile = await getFunnelProfile(session.shop);
  const shopHandle = session.shop.replace(".myshopify.com", "");

  return {
    profile,
    fields: profile.formFields,
    themeEditorUrl: `https://admin.shopify.com/store/${shopHandle}/themes/current/editor?context=apps`,
  };
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const formData = await request.formData();
  const intent = String(formData.get("intent") || "");
  const profile = await getFunnelProfile(session.shop);

  if (intent === "save-form-settings") {
    const formTitle = String(formData.get("formTitle") || "").trim();
    const formSubtitle = String(formData.get("formSubtitle") || "").trim();
    const submitButtonLabel = String(formData.get("submitButtonLabel") || "").trim();
    const successMessage = String(formData.get("successMessage") || "").trim();
    const buttonBgColor = String(formData.get("buttonBgColor") || "").trim();
    const buttonTextColor = String(formData.get("buttonTextColor") || "").trim();
    const themeColor = String(formData.get("themeColor") || "").trim();
    const launcherBgColor = String(formData.get("launcherBgColor") || "").trim();
    const launcherTextColor = String(formData.get("launcherTextColor") || "").trim();
    const launcherIcon = String(formData.get("launcherIcon") || "").trim();
    const launcherAnimation = String(formData.get("launcherAnimation") || "none").trim();
    const borderRadius = Number(formData.get("borderRadius") || 16);
    const collectAddress = formData.get("collectAddress") === "on";

    if (!formTitle || !submitButtonLabel || !successMessage) {
      return { status: "error" as const, message: "Form title, button label, and success message are required." };
    }

    await prisma.funnelProfile.update({
      where: { shop: session.shop },
      data: {
        formTitle,
        formSubtitle,
        submitButtonLabel,
        successMessage,
        themeColor,
        launcherBgColor,
        launcherTextColor,
        launcherIcon,
        launcherAnimation,
        buttonBgColor,
        buttonTextColor,
        borderRadius: Number.isFinite(borderRadius) ? Math.min(28, Math.max(8, borderRadius)) : 16,
        collectAddress,
        ...defaultColors,
      },
    });

    return { status: "success" as const, message: "COD form saved." };
  }

  if (intent === "create-field") {
    const label = String(formData.get("label") || "").trim();
    const fieldKey = String(formData.get("fieldKey") || "").trim();
    const fieldType = String(formData.get("fieldType") || "text").trim();
    const placeholder = String(formData.get("placeholder") || "").trim();
    const required = formData.get("required") === "on";

    if (!label || !fieldKey) {
      return { status: "error" as const, message: "Field label and key are required." };
    }

    await prisma.codFormField.create({
      data: {
        funnelProfileId: profile.id,
        label,
        fieldKey,
        fieldType,
        placeholder,
        required,
        active: true,
        sortOrder: profile.formFields.length + 1,
      },
    });

    return { status: "success" as const, message: "Field added." };
  }

  const id = Number(formData.get("id"));
  if (!id) return { status: "error" as const, message: "Missing field id." };

  if (intent === "toggle-field") {
    const current = formData.get("current") === "true";
    await prisma.codFormField.update({ where: { id }, data: { active: !current } });
    return { status: "success" as const, message: "Field updated." };
  }

  if (intent === "delete-field") {
    await prisma.codFormField.delete({ where: { id } });
    return { status: "success" as const, message: "Field deleted." };
  }

  return { status: "error" as const, message: "Unknown action." };
};

export default function BuilderRoute() {
  const { profile, fields, themeEditorUrl } = useLoaderData<typeof loader>();
  const actionData = useActionData<ActionData>();
  const activeFields = fields.filter((field) => field.active);
  const previewFields = activeFields.length ? activeFields : fields;
  const previewAmount = "INR 1.00";
  const [formSettings, setFormSettings] = useState({
    formTitle: profile.formTitle,
    formSubtitle: profile.formSubtitle,
    submitButtonLabel: profile.submitButtonLabel,
    successMessage: profile.successMessage,
    buttonBgColor: profile.buttonBgColor,
    buttonTextColor: profile.buttonTextColor,
    launcherBgColor: profile.launcherBgColor,
    launcherTextColor: profile.launcherTextColor,
    launcherIcon: profile.launcherIcon,
    launcherAnimation: profile.launcherAnimation,
    themeColor: profile.themeColor,
    borderRadius: String(profile.borderRadius),
    collectAddress: profile.collectAddress
  });

  const updateSetting = (key: keyof typeof formSettings, value: string | boolean) => {
    setFormSettings((current) => ({ ...current, [key]: value }));
  };

  const getFieldIcon = (fieldKey: string) => {
    if (fieldKey === "customerName") return "👤";
    if (fieldKey === "phone") return "☎";
    if (fieldKey === "address1") return "📍";
    if (fieldKey === "city") return "🏙";
    if (fieldKey === "pincode") return "#";
    return "";
  };

  return (
    <s-page heading="COD Form">
      <div className="simpleShell">
        <section className="simpleHero">
          <div>
            <span className="simpleKicker">Step 1</span>
            <h1>Create your COD form</h1>
            <p>Keep it simple. Set the form text, colors, and fields, then test one COD order from the product page.</p>
          </div>
          <a className="simplePrimary" href={themeEditorUrl} target="_top" rel="noreferrer">Enable on theme</a>
        </section>

        {actionData ? (
          <div className={actionData.status === "success" ? "simpleAlert simpleAlertSuccess" : "simpleAlert simpleAlertError"}>
            {actionData.message}
          </div>
        ) : null}

        <div className="simpleGrid">
          <Form method="post" className="simpleCard">
            <input type="hidden" name="intent" value="save-form-settings" />
            <div className="simpleCardHeader">
              <h2>Form settings</h2>
              <button type="submit" className="simplePrimary">Save form</button>
            </div>

            <label className="simpleField">
              <span>Form title</span>
              <input
                name="formTitle"
                value={formSettings.formTitle}
                onChange={(event) => updateSetting("formTitle", event.currentTarget.value)}
              />
            </label>

            <label className="simpleField">
              <span>Subtitle</span>
              <input
                name="formSubtitle"
                value={formSettings.formSubtitle}
                onChange={(event) => updateSetting("formSubtitle", event.currentTarget.value)}
              />
            </label>

            <label className="simpleField">
              <span>Button text</span>
              <input
                name="submitButtonLabel"
                value={formSettings.submitButtonLabel}
                onChange={(event) => updateSetting("submitButtonLabel", event.currentTarget.value)}
              />
            </label>

            <label className="simpleField">
              <span>Success message</span>
              <input
                name="successMessage"
                value={formSettings.successMessage}
                onChange={(event) => updateSetting("successMessage", event.currentTarget.value)}
              />
            </label>

            <div className="simpleTwo">
              <label className="simpleField">
                <span>Form button color</span>
                <input
                  type="color"
                  name="buttonBgColor"
                  value={formSettings.buttonBgColor}
                  onChange={(event) => updateSetting("buttonBgColor", event.currentTarget.value)}
                />
              </label>
              <label className="simpleField">
                <span>Form button text</span>
                <input
                  type="color"
                  name="buttonTextColor"
                  value={formSettings.buttonTextColor}
                  onChange={(event) => updateSetting("buttonTextColor", event.currentTarget.value)}
                />
              </label>
            </div>

            <div className="simpleTwo">
              <label className="simpleField">
                <span>Storefront button color</span>
                <input
                  type="color"
                  name="launcherBgColor"
                  value={formSettings.launcherBgColor}
                  onChange={(event) => updateSetting("launcherBgColor", event.currentTarget.value)}
                />
              </label>
              <label className="simpleField">
                <span>Storefront button text</span>
                <input
                  type="color"
                  name="launcherTextColor"
                  value={formSettings.launcherTextColor}
                  onChange={(event) => updateSetting("launcherTextColor", event.currentTarget.value)}
                />
              </label>
            </div>

            <label className="simpleField">
              <span>Storefront button icon</span>
              <select
                name="launcherIcon"
                value={formSettings.launcherIcon}
                onChange={(event) => updateSetting("launcherIcon", event.currentTarget.value)}
              >
                {launcherIconOptions.map((icon) => (
                  <option value={icon} key={icon || "none"}>
                    {icon ? `${icon} ${icon === "🛒" ? "Cart" : icon === "📦" ? "Box" : icon === "💵" ? "Cash" : icon === "🚚" ? "Delivery" : icon === "⚡" ? "Fast" : icon === "🛍" ? "Bag" : "Check"}` : "No icon"}
                  </option>
                ))}
              </select>
            </label>

            <label className="simpleField">
              <span>Button animation</span>
              <select
                name="launcherAnimation"
                value={formSettings.launcherAnimation}
                onChange={(event) => updateSetting("launcherAnimation", event.currentTarget.value)}
              >
                {launcherAnimationOptions.map((animation) => (
                  <option value={animation.value} key={animation.value}>
                    {animation.label}
                  </option>
                ))}
              </select>
            </label>

            <div className="simpleTwo">
              <label className="simpleField">
                <span>Accent color</span>
                <input
                  type="color"
                  name="themeColor"
                  value={formSettings.themeColor}
                  onChange={(event) => updateSetting("themeColor", event.currentTarget.value)}
                />
              </label>
              <label className="simpleField">
                <span>Corner roundness</span>
                <input
                  type="number"
                  min="8"
                  max="28"
                  name="borderRadius"
                  value={formSettings.borderRadius}
                  onChange={(event) => updateSetting("borderRadius", event.currentTarget.value)}
                />
              </label>
            </div>

            <label className="simpleCheck">
              <input
                type="checkbox"
                name="collectAddress"
                checked={formSettings.collectAddress}
                onChange={(event) => updateSetting("collectAddress", event.currentTarget.checked)}
              />
              <span>Ask customer for address</span>
            </label>
          </Form>

          <section className="simpleCard">
            <div className="simpleCardHeader">
              <h2>Live preview</h2>
              <span className="simplePill">{activeFields.length} active fields</span>
            </div>
            <div className="simplePreview" style={{
              ["--simple-button-bg" as string]: formSettings.buttonBgColor,
              ["--simple-button-text" as string]: formSettings.buttonTextColor,
              ["--simple-launcher-bg" as string]: formSettings.launcherBgColor,
              ["--simple-launcher-text" as string]: formSettings.launcherTextColor,
              ["--simple-accent" as string]: formSettings.themeColor,
              ["--simple-radius" as string]: `${formSettings.borderRadius || 18}px`,
            }}>
              <div className={`simplePreviewLauncher simplePreviewLauncher--${formSettings.launcherAnimation}`}>
                {formSettings.launcherIcon ? <span>{formSettings.launcherIcon}</span> : null}
                <strong>{formSettings.submitButtonLabel}</strong>
              </div>

              <div className="simplePreviewHeader">
                <span className="simplePreviewHome">⌂</span>
                <div>
                  <strong>FAST COD PRO</strong>
                  <span>{formSettings.formSubtitle}</span>
                </div>
                <span className="simplePreviewClose">×</span>
              </div>

              <div className="simplePreviewBody">
                <div className="simplePreviewProduct">
                  <div className="simplePreviewThumb" />
                  <div className="simplePreviewProductMeta">
                    <span>ORDER SUMMARY</span>
                    <strong>t shirt</strong>
                    <b>₹1.00</b>
                    <div className="simplePreviewQty">
                      <span>-</span>
                      <strong>1</strong>
                      <span>+</span>
                    </div>
                  </div>
                </div>

                <div className="simplePreviewPayment">
                  <span>PAYMENT OVERVIEW</span>
                  <div>
                    <small>Subtotal</small>
                    <strong>{previewAmount}</strong>
                  </div>
                  <div>
                    <small>Shipping</small>
                    <strong>Free</strong>
                  </div>
                  <div className="simplePreviewTotal">
                    <small>Total</small>
                    <strong>{previewAmount}</strong>
                  </div>
                </div>

                <h3>{formSettings.formTitle}</h3>
                {previewFields.slice(0, 5).map((field) => (
                  <label className="simplePreviewField" key={field.id}>
                    <span>
                      {field.label}
                      {field.required ? <em>*</em> : null}
                    </span>
                    <div className="simplePreviewInput">
                      <b>{getFieldIcon(field.fieldKey)}</b>
                      <small>{field.placeholder || field.label}</small>
                    </div>
                  </label>
                ))}
                <button type="button">
                  {formSettings.submitButtonLabel.includes("Order")
                    ? `${formSettings.submitButtonLabel} - ${previewAmount}`
                    : `${formSettings.submitButtonLabel}`}
                </button>
              </div>
            </div>
          </section>
        </div>

        <section className="simpleCard">
          <div className="simpleCardHeader">
            <div>
              <h2>Fields</h2>
              <p>Show, hide, add, or delete fields from the live COD form.</p>
            </div>
          </div>

          <Form method="post" className="simpleAddField">
            <input type="hidden" name="intent" value="create-field" />
            <input name="label" placeholder="Field label" />
            <input name="fieldKey" placeholder="field_key" />
            <select name="fieldType" defaultValue="text">
              <option value="text">Text</option>
              <option value="tel">Phone</option>
              <option value="email">Email</option>
              <option value="textarea">Textarea</option>
            </select>
            <input name="placeholder" placeholder="Placeholder" />
            <label className="simpleCheck">
              <input type="checkbox" name="required" />
              <span>Required</span>
            </label>
            <button type="submit" className="simpleSecondary">Add field</button>
          </Form>

          <div className="simpleFieldList">
            {fields.map((field) => (
              <div className="simpleFieldRow" key={field.id}>
                <div>
                  <strong>{field.label}</strong>
                  <span>{field.fieldKey} · {field.fieldType} · {field.required ? "required" : "optional"}</span>
                </div>
                <div className="simpleRowActions">
                  <Form method="post">
                    <input type="hidden" name="intent" value="toggle-field" />
                    <input type="hidden" name="id" value={field.id} />
                    <input type="hidden" name="current" value={String(field.active)} />
                    <button type="submit" className="simpleSecondary">{field.active ? "Hide" : "Show"}</button>
                  </Form>
                  <Form method="post">
                    <input type="hidden" name="intent" value="delete-field" />
                    <input type="hidden" name="id" value={field.id} />
                    <button type="submit" className="simpleDanger">Delete</button>
                  </Form>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="simpleNext">
          <strong>Next after form works:</strong>
          <span>Test storefront submit → confirm Shopify Orders → then keep the form simple until App Store review is complete.</span>
          <Link to="/app/submissions" className="simpleSecondary">Open Orders Queue</Link>
        </section>
      </div>
    </s-page>
  );
}
