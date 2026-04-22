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
  return { fraudRules: profile.fraudRules };
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const formData = await request.formData();
  const intent = String(formData.get("intent") || "");
  const profile = await getFunnelProfile(session.shop);

  if (intent === "create") {
    const name = String(formData.get("name") || "").trim();
    const ruleType = String(formData.get("ruleType") || "").trim();
    const threshold = String(formData.get("threshold") || "").trim();
    const action = String(formData.get("actionLabel") || "").trim();

    if (!name || !ruleType || !threshold || !action) {
      return { status: "error" as const, message: "Fill all fraud rule fields." };
    }

    await prisma.fraudRule.create({
      data: {
        funnelProfileId: profile.id,
        name,
        ruleType,
        threshold,
        action,
        active: true
      }
    });
    return { status: "success" as const, message: "Fraud rule created." };
  }

  const id = Number(formData.get("id"));
  if (!id) return { status: "error" as const, message: "Missing fraud rule id." };

  if (intent === "toggle") {
    const current = formData.get("current") === "true";
    await prisma.fraudRule.update({
      where: { id },
      data: { active: !current }
    });
    return { status: "success" as const, message: "Fraud rule updated." };
  }

  if (intent === "delete") {
    await prisma.fraudRule.delete({ where: { id } });
    return { status: "success" as const, message: "Fraud rule deleted." };
  }

  return { status: "error" as const, message: "Unknown action." };
};

export default function FraudRoute() {
  const { fraudRules } = useLoaderData<typeof loader>();
  const actionData = useActionData<ActionData>();

  return (
    <s-page heading="Fraud Shield">
      <div className="shell">
        <section className="listCard">
          <div className="panelHeader">
            <div>
              <p className="eyebrow">Risk engine</p>
              <h2 className="panelTitle">Manage fraud rules in the database</h2>
              <p className="panelText">
                Create risk rules for postal codes, cart value, or buyer behavior and control them from one place.
              </p>
            </div>
          </div>

          <Form method="post" className="formGridCompact">
            <input type="hidden" name="intent" value="create" />
            <input className="input" name="name" placeholder="Rule name" />
            <input className="input" name="ruleType" placeholder="Rule type" />
            <input className="input" name="threshold" placeholder="Threshold" />
            <input className="input" name="actionLabel" placeholder="Action" />
            <button type="submit" className="primaryButton">Create rule</button>
          </Form>

          {actionData ? (
            <p className={actionData.status === "success" ? "successText" : "errorText"}>
              {actionData.message}
            </p>
          ) : null}

          <div className="recordList">
            {fraudRules.map((rule) => (
              <article className="recordCard" key={rule.id}>
                <div className="recordMeta">
                  <span className="itemTitle">{rule.name}</span>
                  <span className="muted">
                    {rule.ruleType} · {rule.threshold}
                  </span>
                </div>
                <div className="recordActions">
                  <span className="itemValue">{rule.action}</span>
                  <Form method="post">
                    <input type="hidden" name="intent" value="toggle" />
                    <input type="hidden" name="id" value={rule.id} />
                    <input type="hidden" name="current" value={String(rule.active)} />
                    <button type="submit" className="secondaryButton">
                      {rule.active ? "Pause" : "Activate"}
                    </button>
                  </Form>
                  <Form method="post">
                    <input type="hidden" name="intent" value="delete" />
                    <input type="hidden" name="id" value={rule.id} />
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
