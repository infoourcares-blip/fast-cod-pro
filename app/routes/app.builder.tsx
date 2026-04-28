import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { Form, Link, useActionData, useLoaderData } from "react-router";
import { getFunnelProfile } from "../lib/funnel.server";
import prisma from "../db.server";
import { authenticate } from "../shopify.server";

type ActionData = {
  status: "success" | "error";
  message: string;
} | null;

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const profile = await getFunnelProfile(session.shop);
  const shopHandle = session.shop.replace(".myshopify.com", "");

  return {
    profile,
    fields: profile.formFields,
    submissions: profile.submissions,
    themeEditorUrl: `https://admin.shopify.com/store/${shopHandle}/themes/current/editor?context=apps`
  };
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const formData = await request.formData();
  const intent = String(formData.get("intent") || "");
  const profile = await getFunnelProfile(session.shop);

  if (intent === "create-field") {
    const label = String(formData.get("label") || "").trim();
    const fieldKey = String(formData.get("fieldKey") || "").trim();
    const fieldType = String(formData.get("fieldType") || "").trim();
    const placeholder = String(formData.get("placeholder") || "").trim();
    const required = formData.get("required") === "on";

    if (!label || !fieldKey || !fieldType) {
      return { status: "error" as const, message: "Fill all field details." };
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
        sortOrder: profile.formFields.length + 1
      }
    });

    return { status: "success" as const, message: "Field added to form builder." };
  }

  if (intent === "save-form-settings") {
    const formTitle = String(formData.get("formTitle") || "").trim();
    const formSubtitle = String(formData.get("formSubtitle") || "").trim();
    const submitButtonLabel = String(formData.get("submitButtonLabel") || "").trim();
    const successMessage = String(formData.get("successMessage") || "").trim();
    const themeColor = String(formData.get("themeColor") || "").trim();
    const launcherBgColor = String(formData.get("launcherBgColor") || "").trim();
    const launcherTextColor = String(formData.get("launcherTextColor") || "").trim();
    const headerBgColor = String(formData.get("headerBgColor") || "").trim();
    const headerTextColor = String(formData.get("headerTextColor") || "").trim();
    const modalBgColor = String(formData.get("modalBgColor") || "").trim();
    const cardBgColor = String(formData.get("cardBgColor") || "").trim();
    const textColor = String(formData.get("textColor") || "").trim();
    const mutedTextColor = String(formData.get("mutedTextColor") || "").trim();
    const inputBgColor = String(formData.get("inputBgColor") || "").trim();
    const inputTextColor = String(formData.get("inputTextColor") || "").trim();
    const inputBorderColor = String(formData.get("inputBorderColor") || "").trim();
    const summaryBgColor = String(formData.get("summaryBgColor") || "").trim();
    const buttonBgColor = String(formData.get("buttonBgColor") || "").trim();
    const buttonTextColor = String(formData.get("buttonTextColor") || "").trim();
    const borderRadius = Number(formData.get("borderRadius") || 18);
    const collectAddress = formData.get("collectAddress") === "on";

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
        headerBgColor,
        headerTextColor,
        modalBgColor,
        cardBgColor,
        textColor,
        mutedTextColor,
        inputBgColor,
        inputTextColor,
        inputBorderColor,
        summaryBgColor,
        buttonBgColor,
        buttonTextColor,
        borderRadius: Number.isFinite(borderRadius) ? Math.min(28, Math.max(8, borderRadius)) : 18,
        collectAddress
      }
    });

    return { status: "success" as const, message: "Form settings saved." };
  }

  const id = Number(formData.get("id"));
  if (!id) return { status: "error" as const, message: "Missing field id." };

  if (intent === "toggle-field") {
    const current = formData.get("current") === "true";
    await prisma.codFormField.update({
      where: { id },
      data: { active: !current }
    });
    return { status: "success" as const, message: "Field updated." };
  }

  if (intent === "delete-field") {
    await prisma.codFormField.delete({ where: { id } });
    return { status: "success" as const, message: "Field removed." };
  }

  return { status: "error" as const, message: "Unknown builder action." };
};

export default function BuilderRoute() {
  const { profile, fields, submissions: _submissions, themeEditorUrl } = useLoaderData<typeof loader>();
  const actionData = useActionData<ActionData>();
  const activeFields = fields.filter((field) => field.active);
  const previewFields = activeFields.length ? activeFields : fields;
  const designFields = [
    ["themeColor", "Accent / focus color", profile.themeColor],
    ["launcherBgColor", "Launcher background", profile.launcherBgColor],
    ["launcherTextColor", "Launcher text", profile.launcherTextColor],
    ["headerBgColor", "Header background", profile.headerBgColor],
    ["headerTextColor", "Header text", profile.headerTextColor],
    ["modalBgColor", "Popup background", profile.modalBgColor],
    ["cardBgColor", "Card background", profile.cardBgColor],
    ["textColor", "Main text", profile.textColor],
    ["mutedTextColor", "Muted text", profile.mutedTextColor],
    ["inputBgColor", "Input background", profile.inputBgColor],
    ["inputTextColor", "Input text", profile.inputTextColor],
    ["inputBorderColor", "Input border", profile.inputBorderColor],
    ["summaryBgColor", "Summary card", profile.summaryBgColor],
    ["buttonBgColor", "Primary button", profile.buttonBgColor],
    ["buttonTextColor", "Primary button text", profile.buttonTextColor]
  ] as const;
  const latestSubmission = _submissions[0] ?? null;
  let draftOrderWarning: string | null = null;

  if (latestSubmission?.payloadJson) {
    try {
      const payload = JSON.parse(latestSubmission.payloadJson) as { draftError?: string };
      draftOrderWarning = payload.draftError || null;
    } catch {
      draftOrderWarning = null;
    }
  }

  return (
    <s-page heading="COD Form Builder">
      <div className="proShell">
        <section className="proHero proHeroCompact">
          <div>
            <span className="proEyebrow">Working form builder</span>
            <h1>Edit the live COD form used on your product page.</h1>
            <p>Change copy, colors, active fields, address collection, and preview the exact popup styling.</p>
          </div>
          <a className="proButton" href={themeEditorUrl} target="_top" rel="noreferrer">Enable in Theme</a>
        </section>

        {draftOrderWarning ? (
          <section className="warningCard compactWarningCard">
            <div className="compactWarningCopy">
              <p className="eyebrow">Draft order status</p>
              <h2 className="panelTitle">Leads are saving, but auto draft orders need Shopify approval</h2>
            </div>
            <Link className="ghostButton" to="/app/submissions">Open Orders Queue</Link>
          </section>
        ) : null}

        <section className="designerShell">
          <div className="designerToolbar">
            <div className="designerStatus">
              <span className="designerSavedDot" />
              <span>{activeFields.length} active fields</span>
            </div>
            <div className="designerToolbarActions">
              <a className="ghostButton ghostButtonAccent" href="#form-designer">Form Designer</a>
              <a className="ghostButton" href="#add-field">Add Field</a>
              <a className="ghostButton" href="#field-list">Manage Fields</a>
              <a className="ghostButton" href={themeEditorUrl} target="_top" rel="noreferrer">Theme Editor</a>
            </div>
          </div>

          {actionData ? (
            <p className={actionData.status === "success" ? "successText" : "errorText"}>
              {actionData.message}
            </p>
          ) : null}

          <div className="designerWorkspace">
            <div className="designerCanvasWrap">
              <div className="designerCanvasBackdrop">
                <div
                  className="designerCanvas"
                  style={{
                    ["--preview-header-bg" as string]: profile.headerBgColor,
                    ["--preview-header-text" as string]: profile.headerTextColor,
                    ["--preview-modal-bg" as string]: profile.modalBgColor,
                    ["--preview-card-bg" as string]: profile.cardBgColor,
                    ["--preview-text" as string]: profile.textColor,
                    ["--preview-muted" as string]: profile.mutedTextColor,
                    ["--preview-input-bg" as string]: profile.inputBgColor,
                    ["--preview-input-text" as string]: profile.inputTextColor,
                    ["--preview-input-border" as string]: profile.inputBorderColor,
                    ["--preview-summary-bg" as string]: profile.summaryBgColor,
                    ["--preview-button-bg" as string]: profile.buttonBgColor,
                    ["--preview-button-text" as string]: profile.buttonTextColor,
                    ["--preview-launcher-bg" as string]: profile.launcherBgColor,
                    ["--preview-launcher-text" as string]: profile.launcherTextColor,
                    ["--preview-radius" as string]: `${profile.borderRadius}px`
                  }}
                >
                  <div className="designerCanvasHead">
                    <div className="designerCanvasTitle">
                      <span className="designerCanvasIcon">⌂</span>
                      <strong>CASH ON DELIVERY</strong>
                    </div>
                    <button className="designerCanvasClose" type="button">×</button>
                  </div>
                  <div className="designerCanvasBody">
                    <div className="designerPreviewLeft">
                      <h3 className="designerPreviewFormTitle">{profile.formTitle}</h3>
                      <p className="designerPreviewFormSubtitle">{profile.formSubtitle}</p>
                      <div className="designerPreviewFieldsGrid">
                        {previewFields.slice(0, 6).map((field) => (
                          <label className="designerPreviewField" key={field.id}>
                            <span className="designerPreviewLabel">
                              {field.label}
                              {field.required ? <em>*</em> : null}
                            </span>
                            <div className="designerPreviewInputBox">{field.placeholder || field.label}</div>
                          </label>
                        ))}
                      </div>
                      <div className="designerPreviewShipping">
                        <span>Shipping method</span>
                        <div className="designerPreviewShippingRow">
                          <strong>Free shipping</strong>
                          <span>Free</span>
                        </div>
                      </div>
                    </div>

                    <div className="designerPreviewRight">
                      <div className="designerProductCard">
                        <div className="designerProductThumb" />
                        <div className="designerProductMeta">
                          <strong>{profile.brandName || "Simple Product"}</strong>
                          <span>{profile.defaultCurrency} 999.00</span>
                          <div className="designerProductQty">
                            <span>−</span>
                            <strong>1</strong>
                            <span>+</span>
                          </div>
                        </div>
                      </div>

                      <div className="designerSummaryCard">
                        <div className="designerSummaryRow"><span>Subtotal</span><strong>{profile.defaultCurrency} 999.00</strong></div>
                        <div className="designerSummaryRow"><span>Shipping</span><strong>Free</strong></div>
                        <div className="designerSummaryRow designerSummaryRowGrand"><span>Total</span><strong>{profile.defaultCurrency} 999.00</strong></div>
                      </div>

                      <div className="designerSideNote">Accept our terms and conditions</div>
                      <div className="designerCanvasButton">{profile.submitButtonLabel}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="designerSidebar">
              <Form method="post" className="designerSideCard designerSettingsForm" id="form-designer">
                <input type="hidden" name="intent" value="save-form-settings" />
                <div className="designerSideCardHeader">
                  <h3>Form Designer</h3>
                  <button type="submit" className="primaryButton">Save</button>
                </div>

                <div className="designerSettingsSections">
                  <div className="builderSection">
                    <div className="builderSectionHeader">
                      <div>
                        <h3 className="builderSectionTitle">Content</h3>
                        <p className="builderSectionText">Edit titles, helper text, and CTA copy.</p>
                      </div>
                    </div>
                    <div className="formGridCompact formGridCompactWide">
                      <label className="field">
                        <span className="label">Form title</span>
                        <input className="input" name="formTitle" defaultValue={profile.formTitle} />
                      </label>
                      <label className="field">
                        <span className="label">Subtitle</span>
                        <input className="input" name="formSubtitle" defaultValue={profile.formSubtitle} />
                      </label>
                      <label className="field">
                        <span className="label">Button label</span>
                        <input className="input" name="submitButtonLabel" defaultValue={profile.submitButtonLabel} />
                      </label>
                      <label className="field">
                        <span className="label">Success message</span>
                        <input className="input" name="successMessage" defaultValue={profile.successMessage} />
                      </label>
                    </div>
                  </div>

                  <div className="builderSection">
                    <div className="builderSectionHeader">
                      <div>
                        <h3 className="builderSectionTitle">Design controls</h3>
                        <p className="builderSectionText">Everything a merchant needs to style the popup without code.</p>
                      </div>
                    </div>
                    <div className="formGridCompact formGridCompactWide builderColorGrid">
                      {designFields.map(([name, label, value]) => (
                        <label className="field colorField" key={name}>
                          <span className="label">{label}</span>
                          <span className="colorInputRow">
                            <input className="colorInput" type="color" name={name} defaultValue={String(value)} />
                            <input className="input monoInput" name={`${name}Preview`} defaultValue={String(value)} readOnly />
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="builderSection">
                    <div className="builderSectionHeader">
                      <div>
                        <h3 className="builderSectionTitle">Shape and layout</h3>
                        <p className="builderSectionText">Control popup softness and address field collection.</p>
                      </div>
                      <div className="radiusBadge">{profile.borderRadius}px</div>
                    </div>
                    <div className="builderRangeWrap">
                      <label className="field">
                        <span className="label">Corner roundness</span>
                        <input className="rangeInput" type="range" min="8" max="28" step="1" name="borderRadius" defaultValue={profile.borderRadius} />
                      </label>
                    </div>
                    <label className="checkRow">
                      <input type="checkbox" name="collectAddress" defaultChecked={profile.collectAddress} />
                      <span>Collect address fields</span>
                    </label>
                  </div>
                </div>
              </Form>

              <Form method="post" className="designerSideCard" id="add-field">
                <div className="designerSideCardHeader">
                  <h3>Add Field Element</h3>
                </div>
                <input type="hidden" name="intent" value="create-field" />
                <div className="formGridCompact formGridCompactWide">
                  <input className="input" name="label" placeholder="Label" />
                  <input className="input" name="fieldKey" placeholder="field key" />
                  <input className="input" name="fieldType" placeholder="text, tel, textarea" />
                  <input className="input" name="placeholder" placeholder="Placeholder" />
                </div>
                <div className="designerFieldFooter">
                  <label className="checkRow">
                    <input type="checkbox" name="required" defaultChecked />
                    <span>Required</span>
                  </label>
                  <button type="submit" className="primaryButton">Add field element</button>
                </div>
              </Form>

              <div className="designerSideCard" id="field-list">
                <div className="designerSideCardHeader">
                  <h3>Field Elements</h3>
                </div>
                <div className="designerFieldList">
                  {fields.map((field) => (
                    <div className="designerFieldItem" key={field.id}>
                      <div>
                        <strong>{field.label}</strong>
                        <span>{field.fieldKey} · {field.fieldType}</span>
                      </div>
                      <div className="designerFieldItemActions">
                        <Form method="post">
                          <input type="hidden" name="intent" value="toggle-field" />
                          <input type="hidden" name="id" value={field.id} />
                          <input type="hidden" name="current" value={String(field.active)} />
                          <button type="submit" className="secondaryButton">{field.active ? "Hide" : "Show"}</button>
                        </Form>
                        <Form method="post">
                          <input type="hidden" name="intent" value="delete-field" />
                          <input type="hidden" name="id" value={field.id} />
                          <button type="submit" className="dangerButton">Delete</button>
                        </Form>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="designerSideCard designerHelperCard">
                <div className="designerSideCardHeader">
                  <h3>Quick links</h3>
                </div>
                <div className="buttonRow">
                  <Link className="ghostButton" to="/app/submissions">Orders Queue</Link>
                  <a className="ghostButton" href={profile.tutorialUrl} target="_blank" rel="noreferrer">Watch Tutorial</a>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </s-page>
  );
}
