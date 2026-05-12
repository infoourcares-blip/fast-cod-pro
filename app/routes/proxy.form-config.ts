import type { LoaderFunctionArgs } from "react-router";
import { getFunnelProfile } from "../lib/funnel.server";
import { authenticate } from "../shopify.server";

const requiredFieldFallbacks = [
  {
    key: "customerName",
    label: "Full name",
    type: "text",
    placeholder: "Enter your full name",
    required: true
  },
  {
    key: "phone",
    label: "Phone number",
    type: "tel",
    placeholder: "03xx xxx xxxx",
    required: true
  }
];

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.public.appProxy(request);

  if (!session?.shop) {
    return Response.json({ error: "App proxy session missing." }, { status: 401 });
  }

  const profile = await getFunnelProfile(session.shop);
  const url = new URL(request.url);
  const activeFields = profile.formFields
    .filter((field) => field.active)
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((field) => ({
      key: field.fieldKey,
      label: field.label,
      type: field.fieldType,
      placeholder: field.placeholder,
      required: field.required
    }));
  const activeKeys = new Set(activeFields.map((field) => field.key));
  const fields = [
    ...requiredFieldFallbacks.filter((field) => !activeKeys.has(field.key)),
    ...activeFields
  ];

  return Response.json({
    form: {
      title: profile.formTitle,
      subtitle: profile.formSubtitle,
      submitButtonLabel: profile.submitButtonLabel,
      formButtonLabel: profile.formButtonLabel,
      successMessage: profile.successMessage,
      themeColor: profile.themeColor,
      collectAddress: profile.collectAddress,
      design: {
        launcherBgColor: profile.launcherBgColor,
        launcherTextColor: profile.launcherTextColor,
        launcherIcon: profile.launcherIcon,
        launcherAnimation: profile.launcherAnimation,
        headerBgColor: profile.headerBgColor,
        headerTextColor: profile.headerTextColor,
        modalBgColor: profile.modalBgColor,
        cardBgColor: profile.cardBgColor,
        textColor: profile.textColor,
        mutedTextColor: profile.mutedTextColor,
        inputBgColor: profile.inputBgColor,
        inputTextColor: profile.inputTextColor,
        inputBorderColor: profile.inputBorderColor,
        summaryBgColor: profile.summaryBgColor,
        buttonBgColor: profile.buttonBgColor,
        buttonTextColor: profile.buttonTextColor,
        borderRadius: profile.borderRadius
      }
    },
    fields,
    product: {
      title: url.searchParams.get("product_title") || "Selected product",
      variantId: url.searchParams.get("variant_id") || "",
      price: url.searchParams.get("price") || "",
      currency: profile.defaultCurrency
    }
  }, {
    headers: {
      "Cache-Control": "no-store, max-age=0"
    }
  });
};
