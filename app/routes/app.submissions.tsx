import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { Form, useActionData, useLoaderData } from "react-router";
import prisma from "../db.server";
import { authenticate } from "../shopify.server";

type ActionData = {
  status: "success" | "error";
  message: string;
} | null;

function parsePayload(payloadJson: string | null) {
  if (!payloadJson) return null;

  try {
    return JSON.parse(payloadJson) as {
      invoiceUrl?: string | null;
      draftError?: string | null;
    };
  } catch {
    return null;
  }
}

function toCsvValue(value: string | number | null | undefined) {
  const stringValue = String(value ?? "");
  return `"${stringValue.replaceAll('"', '""')}"`;
}

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const url = new URL(request.url);
  const query = url.searchParams.get("q")?.trim() || "";
  const status = url.searchParams.get("status")?.trim() || "all";

  const where = {
    shop: session.shop,
    ...(status !== "all" ? { status } : {}),
    ...(query
      ? {
          OR: [
            { customerName: { contains: query } },
            { phone: { contains: query } },
            { productTitle: { contains: query } },
            { city: { contains: query } },
          ],
        }
      : {}),
  };

  const submissions = await prisma.codSubmission.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  if (url.searchParams.get("export") === "csv") {
    const header = [
      "ID",
      "Status",
      "Customer Name",
      "Phone",
      "Email",
      "Address",
      "City",
      "Product",
      "Variant ID",
      "Quantity",
      "Amount",
      "Currency",
      "Created At",
      "Draft Error",
    ];

    const rows = submissions.map((submission) => {
      const payload = parsePayload(submission.payloadJson);
      return [
        submission.id,
        submission.status,
        submission.customerName,
        submission.phone,
        submission.email,
        submission.address1,
        submission.city,
        submission.productTitle,
        submission.variantId,
        submission.quantity,
        submission.totalAmount,
        submission.currency,
        submission.createdAt.toISOString(),
        payload?.draftError ?? "",
      ]
        .map(toCsvValue)
        .join(",");
    });

    return new Response([header.map(toCsvValue).join(","), ...rows].join("\n"), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="fast-cod-pro-submissions.csv"`,
      },
    });
  }

  return {
    filters: {
      q: query,
      status,
    },
    submissions: submissions.map((submission) => ({
      ...submission,
      parsedPayload: parsePayload(submission.payloadJson),
    })),
  };
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const formData = await request.formData();
  const intent = String(formData.get("intent") || "");
  const id = Number(formData.get("id"));

  if (!id) {
    return { status: "error" as const, message: "Missing submission id." };
  }

  const existing = await prisma.codSubmission.findFirst({
    where: { id, shop: session.shop },
  });

  if (!existing) {
    return { status: "error" as const, message: "Submission not found." };
  }

  if (intent === "mark-reviewed") {
    await prisma.codSubmission.update({
      where: { id },
      data: { status: "reviewed" },
    });
    return { status: "success" as const, message: "Submission marked as reviewed." };
  }

  if (intent === "mark-confirmed") {
    await prisma.codSubmission.update({
      where: { id },
      data: { status: "confirmed" },
    });
    return { status: "success" as const, message: "Submission marked as confirmed." };
  }

  if (intent === "mark-cancelled") {
    await prisma.codSubmission.update({
      where: { id },
      data: { status: "cancelled" },
    });
    return { status: "success" as const, message: "Submission marked as cancelled." };
  }

  return { status: "error" as const, message: "Unknown submission action." };
};

export default function SubmissionsRoute() {
  const { submissions, filters } = useLoaderData<typeof loader>();
  const actionData = useActionData<ActionData>();

  return (
    <s-page heading="Orders Queue">
      <div className="shell">
        <section className="tableCard">
          <div className="panelHeader">
            <div>
              <p className="eyebrow">Operations</p>
              <h2 className="panelTitle">COD submissions queue</h2>
              <p className="panelText">
                Review incoming COD leads, contact the customer, and move each request through your manual confirmation flow.
              </p>
            </div>
          </div>

          <Form method="get" className="queueToolbar">
            <label className="queueSearch">
              <span className="label">Search</span>
              <input
                className="input"
                type="search"
                name="q"
                placeholder="Search customer, phone, product, city"
                defaultValue={filters.q}
              />
            </label>

            <label className="queueFilter">
              <span className="label">Status</span>
              <select className="input" name="status" defaultValue={filters.status}>
                <option value="all">All statuses</option>
                <option value="pending_manual_review">Pending manual review</option>
                <option value="reviewed">Reviewed</option>
                <option value="confirmed">Confirmed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </label>

            <div className="queueToolbarActions">
              <button type="submit" className="primaryButton">Apply filters</button>
              <a
                className="ghostButton"
                href={`?${new URLSearchParams({
                  ...(filters.q ? { q: filters.q } : {}),
                  ...(filters.status ? { status: filters.status } : {}),
                  export: "csv",
                }).toString()}`}
              >
                Export CSV
              </a>
            </div>
          </Form>

          {actionData ? (
            <p className={actionData.status === "success" ? "successText" : "errorText"}>
              {actionData.message}
            </p>
          ) : null}

          <div className="recordList">
            {submissions.length ? (
              submissions.map((submission) => (
                <article className="queueCard" key={submission.id}>
                  <div className="queueCardTop">
                    <div className="recordMeta">
                      <span className="itemTitle">
                        {submission.customerName} · {submission.phone}
                      </span>
                      <span className="muted">
                        {submission.productTitle} · qty {submission.quantity} · {submission.currency} {submission.totalAmount ?? "-"}
                      </span>
                    </div>
                    <span className={`queueStatus queueStatus-${submission.status}`}>
                      {submission.status.replaceAll("_", " ")}
                    </span>
                  </div>

                  <div className="queueGrid">
                    <div className="queueInfoBlock">
                      <div className="queueInfoLabel">Delivery details</div>
                      <div className="queueInfoValue">
                        {submission.address1 || "No address saved"}
                        {submission.city ? `, ${submission.city}` : ""}
                      </div>
                      <div className="queueInfoValue">{submission.email || "No email provided"}</div>
                    </div>

                    <div className="queueInfoBlock">
                      <div className="queueInfoLabel">Customer notes</div>
                      <div className="queueInfoValue">{submission.notes || "No customer note"}</div>
                    </div>

                    <div className="queueInfoBlock">
                      <div className="queueInfoLabel">Draft order status</div>
                      <div className="queueInfoValue">
                        {submission.draftOrderId ? "Draft order created" : "Manual review required"}
                      </div>
                      {submission.parsedPayload?.draftError ? (
                        <div className="queueAlert">{submission.parsedPayload.draftError}</div>
                      ) : null}
                    </div>
                  </div>

                  <div className="queueActions">
                    <a
                      className="ghostButton"
                      href={`https://wa.me/${submission.phone.replace(/\D/g, "")}?text=${encodeURIComponent(`Hi ${submission.customerName}, we received your COD request for ${submission.productTitle}.`)}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      WhatsApp customer
                    </a>

                    <Form method="post">
                      <input type="hidden" name="intent" value="mark-reviewed" />
                      <input type="hidden" name="id" value={submission.id} />
                      <button type="submit" className="secondaryButton">Mark reviewed</button>
                    </Form>

                    <Form method="post">
                      <input type="hidden" name="intent" value="mark-confirmed" />
                      <input type="hidden" name="id" value={submission.id} />
                      <button type="submit" className="primaryButton">Mark confirmed</button>
                    </Form>

                    <Form method="post">
                      <input type="hidden" name="intent" value="mark-cancelled" />
                      <input type="hidden" name="id" value={submission.id} />
                      <button type="submit" className="dangerButton">Cancel lead</button>
                    </Form>
                  </div>
                </article>
              ))
            ) : (
              <article className="recordCard">
                <div className="recordMeta">
                  <span className="itemTitle">No matching submissions</span>
                  <span className="muted">Try a different search or status filter.</span>
                </div>
              </article>
            )}
          </div>
        </section>
      </div>
    </s-page>
  );
}
