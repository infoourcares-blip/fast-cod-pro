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
    <s-page heading="Upsell / Downsell">
      <div className="proShell">
        <section className="proHero proHeroCompact">
          <div>
            <span className="proEyebrow">AOV booster</span>
            <h1>Create 1-click upsells for COD shoppers.</h1>
            <p>Offer bundles, quantity breaks, and countdown urgency right after the customer submits the COD form.</p>
          </div>
          <button type="button" className="proButton">Enable post-submit upsell</button>
        </section>

        <div className="proGridTwo">
          <section className="proCard">
            <div className="proCardHeader">
              <div>
                <h2>Offer builder</h2>
                <p>Configure the offer merchants can launch in minutes.</p>
              </div>
            </div>
            <Form method="post" className="proForm">
              <input type="hidden" name="intent" value="create" />
              <label className="proField">
                <span>Offer title</span>
                <input name="title" placeholder="Buy 2 and save 10%" />
              </label>
              <div className="proFieldGrid">
                <label className="proField">
                  <span>Offer type</span>
                  <select name="type" defaultValue="upsell">
                    <option value="upsell">Upsell</option>
                    <option value="downsell">Downsell</option>
                    <option value="quantity-break">Quantity break</option>
                    <option value="bundle">Bundle</option>
                  </select>
                </label>
                <label className="proField">
                  <span>Discount %</span>
                  <input name="upliftPercent" placeholder="10" type="number" step="0.1" />
                </label>
              </div>
              <label className="proField">
                <span>Product selection</span>
                <input placeholder="Search product or paste product handle" />
              </label>
              <label className="proField">
                <span>Trigger</span>
                <input name="trigger" placeholder="After COD form submit" />
              </label>
              <label className="proField">
                <span>Timer urgency</span>
                <select defaultValue="300">
                  <option value="0">No timer</option>
                  <option value="120">2 minutes</option>
                  <option value="300">5 minutes</option>
                  <option value="600">10 minutes</option>
                </select>
              </label>
              <button type="submit" className="proButton">Create offer</button>
            </Form>
          </section>

          <section className="proCard proOfferPreview">
            <span className="proEyebrow">Live preview</span>
            <h2>Wait! Add this bestseller?</h2>
            <p>Get 10% off when you add it to your COD order now.</p>
            <div className="proOfferProduct">
              <div className="proOfferImage" />
              <div>
                <strong>Bundle product</strong>
                <span>Limited offer ends in 04:59</span>
              </div>
            </div>
            <button type="button" className="proButton">Add to COD order</button>
            <button type="button" className="proTextButton">No thanks</button>
          </section>
        </div>

        <section className="proCard">
          <div className="proCardHeader">
            <div>
              <h2>Live offers</h2>
              <p>Activate, pause, or delete offers from the database.</p>
            </div>
          </div>

          {actionData ? (
            <p className={actionData.status === "success" ? "successText" : "errorText"}>
              {actionData.message}
            </p>
          ) : null}

          <div className="proTable">
            <div className="proTableRow proTableHead">
              <span>Offer</span>
              <span>Type</span>
              <span>Impact</span>
              <span>Status</span>
            </div>
            {offers.map((offer) => (
              <div className="proTableRow" key={offer.id}>
                <span><strong>{offer.title}</strong><small>{offer.trigger}</small></span>
                <span>{offer.type}</span>
                <span>{offer.upliftPercent ?? 0}% uplift</span>
                <span className="proTableActions">
                  <Form method="post">
                    <input type="hidden" name="intent" value="toggle" />
                    <input type="hidden" name="id" value={offer.id} />
                    <input type="hidden" name="current" value={String(offer.active)} />
                    <button type="submit" className="proTextButton">
                      {offer.active ? "Pause" : "Activate"}
                    </button>
                  </Form>
                  <Form method="post">
                    <input type="hidden" name="intent" value="delete" />
                    <input type="hidden" name="id" value={offer.id} />
                    <button type="submit" className="proTextButton proTextDanger">Delete</button>
                  </Form>
                </span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </s-page>
  );
}
