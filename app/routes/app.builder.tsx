import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { Form, Link, useActionData, useLoaderData } from "react-router";
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

  return (
    <s-page heading="COD Form">
      <div className="simpleShell">
        <section className="simpleHero">
          <div>
            <span className="simpleKicker">Step 1</span>
            <h1>Create your COD form</h1>
            <p>Keep it simple. Set the form text, colors, and fields. Upsells, pixels, and fraud rules can come later.</p>
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
              <input name="formTitle" defaultValue={profile.formTitle} />
            </label>

            <label className="simpleField">
              <span>Subtitle</span>
              <input name="formSubtitle" defaultValue={profile.formSubtitle} />
            </label>

            <label className="simpleField">
              <span>Button text</span>
              <input name="submitButtonLabel" defaultValue={profile.submitButtonLabel} />
            </label>

            <label className="simpleField">
              <span>Success message</span>
              <input name="successMessage" defaultValue={profile.successMessage} />
            </label>

            <div className="simpleTwo">
              <label className="simpleField">
                <span>Button color</span>
                <input type="color" name="buttonBgColor" defaultValue={profile.buttonBgColor} />
              </label>
              <label className="simpleField">
                <span>Text color</span>
                <input type="color" name="buttonTextColor" defaultValue={profile.buttonTextColor} />
              </label>
            </div>

            <div className="simpleTwo">
              <label className="simpleField">
                <span>Accent color</span>
                <input type="color" name="themeColor" defaultValue={profile.themeColor} />
              </label>
              <label className="simpleField">
                <span>Corner roundness</span>
                <input type="number" min="8" max="28" name="borderRadius" defaultValue={profile.borderRadius} />
              </label>
            </div>

            <input type="hidden" name="launcherBgColor" value={profile.launcherBgColor} />
            <input type="hidden" name="launcherTextColor" value={profile.launcherTextColor} />

            <label className="simpleCheck">
              <input type="checkbox" name="collectAddress" defaultChecked={profile.collectAddress} />
              <span>Ask customer for address</span>
            </label>
          </Form>

          <section className="simpleCard">
            <div className="simpleCardHeader">
              <h2>Live preview</h2>
              <span className="simplePill">{activeFields.length} active fields</span>
            </div>
            <div className="simplePreview" style={{
              ["--simple-button-bg" as string]: profile.buttonBgColor,
              ["--simple-button-text" as string]: profile.buttonTextColor,
              ["--simple-radius" as string]: `${profile.borderRadius}px`,
            }}>
              <h3>{profile.formTitle}</h3>
              <p>{profile.formSubtitle}</p>
              {previewFields.slice(0, 5).map((field) => (
                <div className="simplePreviewInput" key={field.id}>
                  {field.placeholder || field.label}
                  {field.required ? <span>*</span> : null}
                </div>
              ))}
              <div className="simplePreviewSummary">
                <span>Total</span>
                <strong>{profile.defaultCurrency} 999.00</strong>
              </div>
              <button type="button">{profile.submitButtonLabel}</button>
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
          <span>Test storefront submit → confirm Shopify Orders → then add upsell, pixel, Google Sheets, and fraud protection one by one.</span>
          <Link to="/app/submissions" className="simpleSecondary">Open Orders Queue</Link>
        </section>
      </div>
    </s-page>
  );
}
