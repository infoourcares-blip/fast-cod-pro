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
  return { automations: profile.automations };
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const formData = await request.formData();
  const intent = String(formData.get("intent") || "");
  const profile = await getFunnelProfile(session.shop);

  if (intent === "create") {
    const name = String(formData.get("name") || "").trim();
    const destination = String(formData.get("destination") || "").trim();
    const event = String(formData.get("event") || "").trim();

    if (!name || !destination || !event) {
      return { status: "error" as const, message: "Fill all automation fields." };
    }

    await prisma.automation.create({
      data: {
        funnelProfileId: profile.id,
        name,
        destination,
        event,
        active: true
      }
    });
    return { status: "success" as const, message: "Automation created." };
  }

  const id = Number(formData.get("id"));
  if (!id) return { status: "error" as const, message: "Missing automation id." };

  if (intent === "toggle") {
    const current = formData.get("current") === "true";
    await prisma.automation.update({
      where: { id },
      data: { active: !current }
    });
    return { status: "success" as const, message: "Automation updated." };
  }

  if (intent === "delete") {
    await prisma.automation.delete({ where: { id } });
    return { status: "success" as const, message: "Automation deleted." };
  }

  return { status: "error" as const, message: "Unknown action." };
};

export default function AutomationsRoute() {
  const { automations } = useLoaderData<typeof loader>();
  const actionData = useActionData<ActionData>();

  return (
    <s-page heading="Automations">
      <div className="shell">
        <section className="panel">
          <div className="panelHeader">
            <div>
              <p className="eyebrow">Operations sync</p>
              <h2 className="panelTitle">Manage live automation workflows</h2>
              <p className="panelText">
                Persist event routing rules for fulfillment, support, and ad attribution directly in the app database.
              </p>
            </div>
          </div>

          <Form method="post" className="formGridCompact">
            <input type="hidden" name="intent" value="create" />
            <input className="input" name="name" placeholder="Automation name" />
            <input className="input" name="destination" placeholder="Destination" />
            <input className="input" name="event" placeholder="Event key" />
            <button type="submit" className="primaryButton">Create automation</button>
          </Form>

          {actionData ? (
            <p className={actionData.status === "success" ? "successText" : "errorText"}>
              {actionData.message}
            </p>
          ) : null}

          <div className="recordList">
            {automations.map((automation) => (
              <article className="recordCard" key={automation.id}>
                <div className="recordMeta">
                  <span className="itemTitle">{automation.name}</span>
                  <span className="muted">
                    {automation.destination} · {automation.event}
                  </span>
                </div>
                <div className="recordActions">
                  <span className="itemValue">
                    {automation.active ? "Active" : "Paused"}
                  </span>
                  <Form method="post">
                    <input type="hidden" name="intent" value="toggle" />
                    <input type="hidden" name="id" value={automation.id} />
                    <input type="hidden" name="current" value={String(automation.active)} />
                    <button type="submit" className="secondaryButton">
                      {automation.active ? "Pause" : "Activate"}
                    </button>
                  </Form>
                  <Form method="post">
                    <input type="hidden" name="intent" value="delete" />
                    <input type="hidden" name="id" value={automation.id} />
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
