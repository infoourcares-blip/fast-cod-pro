import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import prisma from "../db.server";
import { getFunnelProfile } from "../lib/funnel.server";
import { authenticate } from "../shopify.server";

async function handleSubmission(
  request: Request,
  getValue: (key: string) => FormDataEntryValue | string | null
) {
  try {
    const { session, admin } = await authenticate.public.appProxy(request);

    if (!session?.shop || !admin) {
      return Response.json({ error: "Unauthorized proxy request." }, { status: 401 });
    }

    const profile = await getFunnelProfile(session.shop);

    const customerName = String(getValue("customerName") || "").trim();
    const phone = String(getValue("phone") || "").trim();
    const email = String(getValue("email") || "").trim();
    const address1 = String(getValue("address1") || "").trim();
    const city = String(getValue("city") || "").trim();
    const notes = String(getValue("notes") || "").trim();
    const productTitle = String(getValue("productTitle") || "").trim();
    const rawVariantId = String(getValue("variantId") || "").trim();
    const price = Number(getValue("price") || 0);
    const quantity = Number(getValue("quantity") || 1);
    const variantId = rawVariantId.startsWith("gid://shopify/ProductVariant/")
      ? rawVariantId
      : rawVariantId
        ? `gid://shopify/ProductVariant/${rawVariantId}`
        : "";

    if (!customerName || !phone || !variantId || !productTitle) {
      return Response.json({ error: "Missing required COD form values." }, { status: 400 });
    }

    let draftOrder:
      | {
          id?: string;
          invoiceUrl?: string | null;
          totalPriceSet?: {
            presentmentMoney?: {
              amount?: string;
              currencyCode?: string;
            } | null;
          } | null;
        }
      | null
      | undefined;
    let draftError: string | null = null;

    try {
      const draftOrderResponse = await admin.graphql(
        `#graphql
          mutation FastCodProCreateDraftOrder($input: DraftOrderInput!) {
            draftOrderCreate(input: $input) {
              draftOrder {
                id
                invoiceUrl
                totalPriceSet {
                  presentmentMoney {
                    amount
                    currencyCode
                  }
                }
              }
              userErrors {
                field
                message
              }
            }
          }`,
        {
          variables: {
            input: {
              email: email || undefined,
              note: notes || undefined,
              shippingAddress: profile.collectAddress
                ? {
                    address1: address1 || undefined,
                    city: city || undefined
                  }
                : undefined,
              lineItems: [
                {
                  variantId,
                  quantity
                }
              ],
              customAttributes: [
                { key: "customer_name", value: customerName },
                { key: "phone", value: phone },
                { key: "source", value: "fast_cod_pro_theme_form" }
              ]
            }
          }
        }
      );

      const draftPayload = (await draftOrderResponse.json()) as {
        data?: {
          draftOrderCreate?: {
            draftOrder?: {
              id?: string;
              invoiceUrl?: string | null;
              totalPriceSet?: {
                presentmentMoney?: {
                  amount?: string;
                  currencyCode?: string;
                } | null;
              } | null;
            } | null;
            userErrors?: Array<{ message?: string }>;
          } | null;
        };
      };

      const userErrors = draftPayload.data?.draftOrderCreate?.userErrors ?? [];
      if (userErrors.length) {
        draftError = userErrors[0]?.message || "Draft order creation failed.";
      } else {
        draftOrder = draftPayload.data?.draftOrderCreate?.draftOrder;
      }
    } catch (error) {
      draftError = error instanceof Error ? error.message : "Draft order creation failed.";
    }

    await prisma.codSubmission.create({
      data: {
        funnelProfileId: profile.id,
        shop: session.shop,
        status: draftOrder?.id ? "received" : "pending_manual_review",
        customerName,
        phone,
        email: email || null,
        address1: address1 || null,
        city: city || null,
        notes: notes || null,
        productTitle,
        variantId,
        quantity,
        draftOrderId: draftOrder?.id || null,
        totalAmount: Number(draftOrder?.totalPriceSet?.presentmentMoney?.amount || price || 0),
        currency: draftOrder?.totalPriceSet?.presentmentMoney?.currencyCode || profile.defaultCurrency,
        payloadJson: JSON.stringify({
          invoiceUrl: draftOrder?.invoiceUrl || null,
          draftError
        })
      }
    });

    if (!draftOrder?.id) {
      return Response.json({
        ok: true,
        message: "COD request received. Draft order will be reviewed manually.",
        draftOrderCreated: false,
        fallbackReason: draftError
      });
    }

    return Response.json({
      ok: true,
      message: profile.successMessage,
      invoiceUrl: draftOrder?.invoiceUrl || null,
      draftOrderCreated: true
    });
  } catch (error) {
    return Response.json(
      {
        error: error instanceof Error ? error.message : "COD submission failed."
      },
      { status: 500 }
    );
  }
}

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url);

  if (!url.searchParams.get("customerName")) {
    const { session } = await authenticate.public.appProxy(request);

    if (!session?.shop) {
      return Response.json({ error: "Unauthorized proxy request." }, { status: 401 });
    }

    return Response.json(
      { error: "Provide order details to submit a COD order." },
      { status: 400 }
    );
  }

  return handleSubmission(request, (key) => url.searchParams.get(key));
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const formData = await request.formData();
  return handleSubmission(request, (key) => formData.get(key));
};
