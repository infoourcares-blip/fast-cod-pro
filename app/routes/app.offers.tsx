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
  return { offers: profile.offers };
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const formData = await request.formData();
  const intent = String(formData.get("intent") || "");
  const profile = await getFunnelProfile(session.shop);

  if (intent === "create") {
    const title = String(formData.get("title") || "").trim();
    const type = String(formData.get("type") || "").trim();
    const trigger = String(formData.get("trigger") || "").trim();
    const upliftPercent = Number(formData.get("upliftPercent") || 0);

    if (!title || !type || !trigger) {
      return { status: "error" as const, message: "Fill all offer fields." };
    }

    await prisma.offer.create({
      data: {
        funnelProfileId: profile.id,
        title,
        type,
        trigger,
        upliftPercent,
        active: true
      }
    });
    return { status: "success" as const, message: "Offer created." };
  }

  const id = Number(formData.get("id"));
  if (!id) return { status: "error" as const, message: "Missing offer id." };

  if (intent === "toggle") {
    const current = formData.get("current") === "true";
    await prisma.offer.update({
      where: { id },
      data: { active: !current }
    });
    return { status: "success" as const, message: "Offer updated." };
  }

  if (intent === "delete") {
    await prisma.offer.delete({ where: { id } });
    return { status: "success" as const, message: "Offer deleted." };
  }

  return { status: "error" as const, message: "Unknown action." };
};

export default function OffersRoute() {
  const { offers } = useLoaderData<typeof loader>();
  const actionData = useActionData<ActionData>();

  return (
    <s-page heading="Offers and Upsells">
      <div className="shell">
        <section className="panel">
          <div className="panelHeader">
            <div>
              <p className="eyebrow">Revenue AI</p>
              <h2 className="panelTitle">Create and manage live offers</h2>
              <p className="panelText">
                These offers are now stored in the database and can be activated, paused, or deleted.
              </p>
            </div>
          </div>

          <Form method="post" className="formGridCompact">
            <input type="hidden" name="intent" value="create" />
            <input className="input" name="title" placeholder="Offer title" />
            <input className="input" name="type" placeholder="Type (bundle, upsell)" />
            <input className="input" name="trigger" placeholder="Trigger rule" />
            <input className="input" name="upliftPercent" placeholder="Uplift %" type="number" step="0.1" />
            <button type="submit" className="primaryButton">Create offer</button>
          </Form>

          {actionData ? (
            <p className={actionData.status === "success" ? "successText" : "errorText"}>
              {actionData.message}
            </p>
          ) : null}

          <div className="recordList">
            {offers.map((offer) => (
              <article className="recordCard" key={offer.id}>
                <div className="recordMeta">
                  <span className="itemTitle">{offer.title}</span>
                  <span className="muted">{offer.type} · {offer.trigger}</span>
                </div>
                <div className="recordActions">
                  <span className="itemValue">{offer.upliftPercent ?? 0}% uplift</span>
                  <Form method="post">
                    <input type="hidden" name="intent" value="toggle" />
                    <input type="hidden" name="id" value={offer.id} />
                    <input type="hidden" name="current" value={String(offer.active)} />
                    <button type="submit" className="secondaryButton">
                      {offer.active ? "Pause" : "Activate"}
                    </button>
                  </Form>
                  <Form method="post">
                    <input type="hidden" name="intent" value="delete" />
                    <input type="hidden" name="id" value={offer.id} />
                    <button type="submit" className="dangerButton">Delete</button>
                  </Form>
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>
    </s-page>
  );
}
