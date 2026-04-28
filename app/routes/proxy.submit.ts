import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import prisma from "../db.server";
import { getFunnelProfile } from "../lib/funnel.server";
import { authenticate, unauthenticated } from "../shopify.server";

type GraphqlUserError = {
  field?: string[] | string | null;
  message?: string | null;
};

type GraphqlTopLevelError = {
  message?: string | null;
};

function formatGraphqlErrors(
  userErrors: GraphqlUserError[] = [],
  topLevelErrors: GraphqlTopLevelError[] = []
) {
  const formattedUserErrors = userErrors
    .map((error) => {
      const field = Array.isArray(error.field)
        ? error.field.join(".")
        : error.field;
      return [field, error.message].filter(Boolean).join(": ");
    })
    .filter(Boolean);

  const formattedTopLevelErrors = topLevelErrors
    .map((error) => error.message)
    .filter(Boolean);

  return [...formattedUserErrors, ...formattedTopLevelErrors].join(" | ");
}

function normalizeShopDomain(value: FormDataEntryValue | string | null) {
  const shop = String(value || "").trim().toLowerCase();
  return /^[a-z0-9][a-z0-9-]*\.myshopify\.com$/.test(shop) ? shop : "";
}

function isTrustedStorefrontRequest(request: Request, shop: string) {
  const origin = request.headers.get("origin") || "";
  const referer = request.headers.get("referer") || "";
  const forwardedHost = request.headers.get("x-forwarded-host") || "";
  const host = request.headers.get("host") || "";
  const trustedHosts = [origin, referer, forwardedHost, host]
    .filter(Boolean)
    .map((value) => value.toLowerCase());

  return trustedHosts.some((value) => value.includes(shop));
}

async function getSubmissionContext(
  request: Request,
  getValue: (key: string) => FormDataEntryValue | string | null
) {
  try {
    const context = await authenticate.public.appProxy(request);
    if (context.session?.shop && context.admin) {
      return context;
    }
  } catch (_error) {
    // Native storefront form submits may arrive without app proxy signature.
  }

  const fallbackShop = normalizeShopDomain(getValue("shop"));
  if (!fallbackShop || !isTrustedStorefrontRequest(request, fallbackShop)) {
    return null;
  }

  try {
    return await unauthenticated.admin(fallbackShop);
  } catch (_error) {
    return null;
  }
}

async function handleSubmission(
  request: Request,
  getValue: (key: string) => FormDataEntryValue | string | null
) {
  try {
    const context = await getSubmissionContext(request, getValue);

    if (!context?.session?.shop || !context.admin) {
      return Response.json({ error: "Unauthorized proxy request." }, { status: 401 });
    }

    const { session, admin } = context;
    const profile = await getFunnelProfile(session.shop);

    const customerName = String(getValue("customerName") || "").trim();
    const phone = String(getValue("phone") || "").trim();
    const email = String(getValue("email") || "").trim();
    const address1 = String(getValue("address1") || "").trim();
    const pincode = String(getValue("pincode") || "").trim();
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
          order?: {
            id?: string;
            name?: string | null;
          } | null;
          totalPriceSet?: {
            presentmentMoney?: {
              amount?: string;
              currencyCode?: string;
            } | null;
          } | null;
        }
      | null
      | undefined;
    let completedOrder:
      | {
          id?: string;
          name?: string | null;
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
                    city: city || undefined,
                    phone: phone || undefined,
                    zip: pincode || undefined
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
                { key: "payment_method", value: "Cash on Delivery" },
                { key: "source", value: "fast_cod_pro_theme_form" }
              ]
            }
          }
        }
      );

      const draftPayload = (await draftOrderResponse.json()) as {
        errors?: Array<{ message?: string }>;
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
            userErrors?: GraphqlUserError[];
          } | null;
        };
      };

      const userErrors = draftPayload.data?.draftOrderCreate?.userErrors ?? [];
      const graphqlError = formatGraphqlErrors(userErrors, draftPayload.errors);
      if (graphqlError) {
        draftError = graphqlError || "Draft order creation failed.";
        console.error("Fast COD Pro draft order create failed", {
          shop: session.shop,
          draftError,
          productTitle,
          variantId
        });
      } else {
        draftOrder = draftPayload.data?.draftOrderCreate?.draftOrder;
      }
    } catch (error) {
      draftError = error instanceof Error ? error.message : "Draft order creation failed.";
    }

    if (draftOrder?.id) {
      const completeDraftOrder = async (paymentPending: boolean) => {
        const completeResponse = await admin.graphql(
          `#graphql
            mutation FastCodProCompleteDraftOrder($id: ID!, $paymentPending: Boolean!) {
              draftOrderComplete(id: $id, paymentPending: $paymentPending, sourceName: "fast_cod_pro") {
                draftOrder {
                  id
                  order {
                    id
                    name
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
              id: draftOrder.id,
              paymentPending
            }
          }
        );

        const completePayload = (await completeResponse.json()) as {
          errors?: Array<{ message?: string }>;
          data?: {
            draftOrderComplete?: {
              draftOrder?: {
                id?: string;
                order?: {
                  id?: string;
                  name?: string | null;
                } | null;
              } | null;
              userErrors?: GraphqlUserError[];
            } | null;
          };
        };

        const completeErrors =
          completePayload.data?.draftOrderComplete?.userErrors ?? [];
        const graphqlError = formatGraphqlErrors(
          completeErrors,
          completePayload.errors
        );

        return {
          order: completePayload.data?.draftOrderComplete?.draftOrder?.order,
          error: graphqlError
        };
      };

      try {
        const pendingResult = await completeDraftOrder(true);
        if (pendingResult.error) {
          console.error("Fast COD Pro payment-pending draft complete failed", {
            shop: session.shop,
            draftOrderId: draftOrder.id,
            draftError: pendingResult.error
          });
          const paidFallbackResult = await completeDraftOrder(false);
          if (paidFallbackResult.error) {
            draftError = paidFallbackResult.error || pendingResult.error;
            console.error("Fast COD Pro paid fallback draft complete failed", {
              shop: session.shop,
              draftOrderId: draftOrder.id,
              draftError
            });
          } else {
            completedOrder = paidFallbackResult.order;
            draftError = null;
          }
        } else {
          completedOrder = pendingResult.order;
        }
      } catch (error) {
        draftError = error instanceof Error ? error.message : "Order creation from draft failed.";
      }
    }

    await prisma.codSubmission.create({
      data: {
        funnelProfileId: profile.id,
        shop: session.shop,
        status: completedOrder?.id ? "confirmed" : draftOrder?.id ? "received" : "pending_manual_review",
        customerName,
        phone,
        email: email || null,
        address1: address1 || null,
        city: city || null,
        notes: [notes, pincode ? `Pincode: ${pincode}` : ""].filter(Boolean).join("\n") || null,
        productTitle,
        variantId,
        quantity,
        draftOrderId: draftOrder?.id || null,
        totalAmount: Number(draftOrder?.totalPriceSet?.presentmentMoney?.amount || price || 0),
        currency: draftOrder?.totalPriceSet?.presentmentMoney?.currencyCode || profile.defaultCurrency,
        payloadJson: JSON.stringify({
          invoiceUrl: draftOrder?.invoiceUrl || null,
          orderId: completedOrder?.id || null,
          orderName: completedOrder?.name || null,
          draftError
        })
      }
    });

    if (!completedOrder?.id) {
      return Response.json(
        {
          error: draftError || "Shopify order could not be created.",
          message: draftOrder?.id
            ? "Draft order was created, but Shopify did not convert it to an order."
            : "COD request could not create a Shopify order.",
          draftOrderCreated: Boolean(draftOrder?.id),
          orderCreated: false,
          fallbackReason: draftError
        },
        { status: 422 }
      );
    }

    return Response.json({
      ok: true,
      message: `${profile.successMessage} Shopify order ${completedOrder.name || ""} has been created.`.trim(),
      invoiceUrl: draftOrder?.invoiceUrl || null,
      draftOrderCreated: true,
      orderCreated: true,
      orderId: completedOrder.id,
      orderName: completedOrder.name || null
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
