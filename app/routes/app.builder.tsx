import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { Form, Link, useActionData, useLoaderData, useNavigation, useSubmit } from "react-router";
import type { DragEvent } from "react";
import { useEffect, useRef, useState } from "react";
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

const fieldTypeOptions = [
  { label: "Short text", value: "text" },
  { label: "Phone number", value: "tel" },
  { label: "Email", value: "email" },
  { label: "Long answer", value: "textarea" }
];

const fieldPresets = [
  { label: "Email", fieldType: "email", placeholder: "Enter your email", required: false },
  { label: "Pincode", fieldType: "text", placeholder: "Enter delivery pincode", required: true },
  { label: "Landmark", fieldType: "text", placeholder: "Near shop, building, or road", required: false },
  { label: "Alternate phone", fieldType: "tel", placeholder: "Enter alternate phone number", required: false },
  { label: "State", fieldType: "text", placeholder: "Enter your state", required: false },
  { label: "Order note", fieldType: "textarea", placeholder: "Any special request", required: false }
];

const toFieldKey = (value: string) => {
  const words = value
    .trim()
    .replace(/[^a-zA-Z0-9]+/g, " ")
    .split(" ")
    .filter(Boolean);

  if (!words.length) return "customField";

  return words
    .map((word, index) => {
      const lower = word.toLowerCase();
      return index === 0 ? lower : `${lower.charAt(0).toUpperCase()}${lower.slice(1)}`;
    })
    .join("");
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
    const formButtonLabel = String(formData.get("formButtonLabel") || "").trim();
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

    if (!formTitle || !submitButtonLabel || !formButtonLabel || !successMessage) {
      return { status: "error" as const, message: "Popup title, button labels, and note are required." };
    }

    await prisma.funnelProfile.update({
      where: { shop: session.shop },
      data: {
        formTitle,
        formSubtitle,
        submitButtonLabel,
        formButtonLabel,
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

    return { status: "success" as const, message: "COD form settings saved." };
  }

  if (intent === "create-field") {
    const label = String(formData.get("label") || "").trim();
    const fieldType = String(formData.get("fieldType") || "text").trim();
    const placeholder = String(formData.get("placeholder") || "").trim();
    const required = formData.get("required") === "on";

    if (!label) {
      return { status: "error" as const, message: "Field name is required." };
    }

    if (!fieldTypeOptions.some((option) => option.value === fieldType)) {
      return { status: "error" as const, message: "Choose a valid answer type." };
    }

    const baseKey = toFieldKey(label);
    const existingKeys = new Set(
      profile.formFields.map((field) => field.fieldKey.toLowerCase())
    );
    let fieldKey = baseKey;
    let suffix = 2;

    while (existingKeys.has(fieldKey.toLowerCase())) {
      fieldKey = `${baseKey}${suffix}`;
      suffix += 1;
    }

    const maxSortOrder = profile.formFields.reduce(
      (max, field) => Math.max(max, field.sortOrder),
      0
    );

    await prisma.codFormField.create({
      data: {
        funnelProfileId: profile.id,
        label,
        fieldKey,
        fieldType,
        placeholder: placeholder || null,
        required,
        sortOrder: maxSortOrder + 1,
        active: true
      }
    });

    return { status: "success" as const, message: "Field added to COD form." };
  }

  if (intent === "reorder-fields") {
    const fieldIds = String(formData.get("fieldIds") || "")
      .split(",")
      .map((value) => Number(value))
      .filter(Boolean);

    if (!fieldIds.length) {
      return { status: "error" as const, message: "No fields selected for reorder." };
    }

    const ownedFields = await prisma.codFormField.findMany({
      where: {
        funnelProfileId: profile.id,
        id: { in: fieldIds }
      },
      select: { id: true }
    });
    const ownedFieldIds = new Set(ownedFields.map((field) => field.id));
    const validFieldIds = fieldIds.filter((id) => ownedFieldIds.has(id));

    if (validFieldIds.length !== fieldIds.length) {
      return { status: "error" as const, message: "Some fields could not be reordered." };
    }

    await prisma.$transaction(
      validFieldIds.map((id, index) =>
        prisma.codFormField.update({
          where: { id },
          data: { sortOrder: index + 1 }
        })
      )
    );

    return { status: "success" as const, message: "Field order saved." };
  }

  const id = Number(formData.get("id"));
  if (!id) return { status: "error" as const, message: "Missing field id." };

  if (intent === "toggle-field") {
    const current = formData.get("current") === "true";
    const field = await prisma.codFormField.findFirst({
      where: { id, funnelProfileId: profile.id },
      select: { id: true }
    });

    if (!field) return { status: "error" as const, message: "Field not found." };

    await prisma.codFormField.update({ where: { id }, data: { active: !current } });
    return { status: "success" as const, message: "Field updated." };
  }

  if (intent === "delete-field") {
    const field = await prisma.codFormField.findFirst({
      where: { id, funnelProfileId: profile.id },
      select: { id: true }
    });

    if (!field) return { status: "error" as const, message: "Field not found." };

    await prisma.codFormField.delete({ where: { id } });
    return { status: "success" as const, message: "Field deleted." };
  }

  return { status: "error" as const, message: "Unknown action." };
};

export default function BuilderRoute() {
  const { profile, fields, themeEditorUrl } = useLoaderData<typeof loader>();
  const actionData = useActionData<ActionData>();
  const navigation = useNavigation();
  const submit = useSubmit();
  const isSavingForm =
    navigation.state !== "idle" &&
    navigation.formData?.get("intent") === "save-form-settings";
  const previewAmount = "INR 1.00";
  const [formSettings, setFormSettings] = useState({
    formTitle: profile.formTitle,
    formSubtitle: profile.formSubtitle,
    submitButtonLabel: profile.submitButtonLabel,
    formButtonLabel: profile.formButtonLabel,
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
  const [newField, setNewField] = useState({
    label: "",
    fieldType: "text",
    placeholder: "",
    required: false,
  });
  const [orderedFields, setOrderedFields] = useState(fields);
  const [draggedFieldId, setDraggedFieldId] = useState<number | null>(null);
  const latestOrderRef = useRef(fields);
  const hasPendingOrderSaveRef = useRef(false);
  const isAddingField =
    navigation.state !== "idle" &&
    navigation.formData?.get("intent") === "create-field";
  const generatedFieldKey = toFieldKey(newField.label);
  const activeFields = orderedFields.filter((field) => field.active);

  useEffect(() => {
    setOrderedFields(fields);
    latestOrderRef.current = fields;
  }, [fields]);

  const updateSetting = (key: keyof typeof formSettings, value: string | boolean) => {
    setFormSettings((current) => ({ ...current, [key]: value }));
  };

  const updateNewField = (key: keyof typeof newField, value: string | boolean) => {
    setNewField((current) => ({ ...current, [key]: value }));
  };

  const saveFieldOrder = (nextFields = latestOrderRef.current) => {
    if (!hasPendingOrderSaveRef.current) return;
    hasPendingOrderSaveRef.current = false;
    const reorderData = new FormData();
    reorderData.set("intent", "reorder-fields");
    reorderData.set("fieldIds", nextFields.map((field) => field.id).join(","));
    submit(reorderData, { method: "post", replace: true });
  };

  const moveDraggedField = (targetFieldId: number) => {
    if (!draggedFieldId || draggedFieldId === targetFieldId) return;

    const currentFields = latestOrderRef.current;
    const draggedIndex = currentFields.findIndex((field) => field.id === draggedFieldId);
    const targetIndex = currentFields.findIndex((field) => field.id === targetFieldId);
    if (draggedIndex < 0 || targetIndex < 0) return;

    const nextFields = [...currentFields];
    const [draggedField] = nextFields.splice(draggedIndex, 1);
    nextFields.splice(targetIndex, 0, draggedField);
    latestOrderRef.current = nextFields;
    hasPendingOrderSaveRef.current = true;
    setOrderedFields(nextFields);
  };

  const startFieldDrag = (event: DragEvent<HTMLElement>, fieldId: number) => {
    setDraggedFieldId(fieldId);
    latestOrderRef.current = orderedFields;
    hasPendingOrderSaveRef.current = false;
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", String(fieldId));
  };

  const finishFieldDrag = () => {
    saveFieldOrder();
    setDraggedFieldId(null);
  };

  return (
    <s-page heading="COD Form">
      <div className="simpleShell">
        <section className="simpleHero">
          <div>
            <span className="simpleKicker">Step 1</span>
            <h1>Customize your COD popup</h1>
            <p>Customers enter delivery details in your popup, then Fast COD Pro creates a Shopify order and opens the native order status page.</p>
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
              <h2>Button settings</h2>
              <button type="submit" className="simplePrimary" disabled={isSavingForm}>
                {isSavingForm ? "Saving..." : "Save form"}
              </button>
            </div>

            <label className="simpleField">
              <span>Popup title</span>
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
              <span>Storefront button label</span>
              <input
                name="submitButtonLabel"
                value={formSettings.submitButtonLabel}
                onChange={(event) => updateSetting("submitButtonLabel", event.currentTarget.value)}
              />
            </label>

            <label className="simpleField">
              <span>Popup submit button label</span>
              <input
                name="formButtonLabel"
                value={formSettings.formButtonLabel}
                onChange={(event) => updateSetting("formButtonLabel", event.currentTarget.value)}
              />
            </label>

            <label className="simpleField">
              <span>Success note</span>
              <input
                name="successMessage"
                value={formSettings.successMessage}
                onChange={(event) => updateSetting("successMessage", event.currentTarget.value)}
              />
            </label>

            <div className="simpleTwo">
              <label className="simpleField">
                <span>Popup button color</span>
                <input
                  type="color"
                  name="buttonBgColor"
                  value={formSettings.buttonBgColor}
                  onChange={(event) => updateSetting("buttonBgColor", event.currentTarget.value)}
                />
              </label>
              <label className="simpleField">
                <span>Popup button text</span>
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
              <span>Ask customer for delivery address</span>
            </label>
          </Form>

          <section className="simpleCard">
            <div className="simpleCardHeader">
              <h2>Live preview</h2>
              <span className="simplePill">COD popup</span>
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
                  <span>Shopify order status redirect</span>
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
                <div className="simplePreviewField">
                  <span>Customer details</span>
                  <div className="simplePreviewInput">
                    <b>✓</b>
                    <small>Collected in the COD popup</small>
                  </div>
                </div>
                <div className="simplePreviewField">
                  <span>Shipping address</span>
                  <div className="simplePreviewInput">
                    <b>✓</b>
                    <small>Saved on the Shopify order</small>
                  </div>
                </div>
                <div className="simplePreviewField">
                  <span>Payment method</span>
                  <div className="simplePreviewInput">
                    <b>✓</b>
                    <small>Cash on Delivery pending</small>
                  </div>
                </div>
                <button type="button">
                  {formSettings.formButtonLabel} - {previewAmount}
                </button>
              </div>
            </div>
          </section>
        </div>

        <section className="simpleCard">
          <div className="simpleCardHeader">
            <div>
              <h2>COD popup fields</h2>
              <p>Add, hide, delete, or drag fields into the order you want customers to fill before the Shopify order is created.</p>
            </div>
          </div>

          <Form method="post" className="simpleAddField">
            <input type="hidden" name="intent" value="create-field" />
            <input type="hidden" name="fieldKey" value={generatedFieldKey} />
            <label className="simpleField">
              <span>Field name</span>
              <input
                name="label"
                placeholder="Example: Pincode"
                value={newField.label}
                onChange={(event) => updateNewField("label", event.currentTarget.value)}
              />
            </label>
            <label className="simpleField">
              <span>Answer type</span>
              <select
                name="fieldType"
                value={newField.fieldType}
                onChange={(event) => updateNewField("fieldType", event.currentTarget.value)}
              >
                {fieldTypeOptions.map((option) => (
                  <option value={option.value} key={option.value}>{option.label}</option>
                ))}
              </select>
            </label>
            <label className="simpleField">
              <span>Placeholder</span>
              <input
                name="placeholder"
                placeholder="Example: Enter delivery pincode"
                value={newField.placeholder}
                onChange={(event) => updateNewField("placeholder", event.currentTarget.value)}
              />
            </label>
            <label className="simpleCheck simpleRequiredCheck">
              <input
                type="checkbox"
                name="required"
                checked={newField.required}
                onChange={(event) => updateNewField("required", event.currentTarget.checked)}
              />
              <span>Required field</span>
            </label>
            <button type="submit" className="simplePrimary" disabled={isAddingField}>
              {isAddingField ? "Adding..." : "Add field"}
            </button>
            <div className="simpleFieldHelper">
              <span>Quick fill:</span>
              {fieldPresets.map((preset) => (
                <button
                  type="button"
                  className="simplePresetButton"
                  key={preset.label}
                  onClick={() => setNewField(preset)}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </Form>

          <div className="simpleFieldListHeader">
            <strong>Current form fields</strong>
            <span>{orderedFields.length} total · {activeFields.length} visible</span>
          </div>

          <div className="simpleFieldList">
            {orderedFields.map((field) => (
              <div
                className={`simpleFieldRow${draggedFieldId === field.id ? " simpleFieldRowDragging" : ""}`}
                key={field.id}
                onDragOver={(event) => {
                  event.preventDefault();
                  event.dataTransfer.dropEffect = "move";
                  moveDraggedField(field.id);
                }}
                onDrop={(event) => {
                  event.preventDefault();
                  finishFieldDrag();
                }}
                onDragEnd={finishFieldDrag}
              >
                <div className="simpleFieldInfo">
                  <button
                    type="button"
                    className="simpleDragHandle"
                    draggable
                    title="Drag to reorder"
                    onDragStart={(event) => startFieldDrag(event, field.id)}
                  >
                    ↕
                  </button>
                  <div>
                    <strong>{field.label}</strong>
                    <span>
                      {fieldTypeOptions.find((option) => option.value === field.fieldType)?.label || field.fieldType}
                      {" · "}
                      {field.required ? "Required" : "Optional"}
                      {" · "}
                      {field.active ? "Visible on form" : "Hidden from form"}
                    </span>
                  </div>
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
