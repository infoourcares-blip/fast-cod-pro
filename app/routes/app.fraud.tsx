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
    <s-page heading="Fraud Protection">
      <div className="proShell">
        <section className="proHero proHeroCompact">
          <div>
            <span className="proEyebrow">Fraud shield</span>
            <h1>Stop fake COD orders before they hit operations.</h1>
            <p>Use recommended limits, blocklists, and clear customer-facing messages to reduce repeat abuse from IPs, phones, and risky quantities.</p>
          </div>
          <label className="proSwitch">
            <input type="checkbox" defaultChecked />
            <span>Recommended settings</span>
          </label>
        </section>

        <div className="proGridTwo">
          <section className="proCard">
            <div className="proCardHeader">
              <div>
                <h2>Order limits</h2>
                <p>Beginner-safe defaults for duplicate prevention.</p>
              </div>
            </div>
            <div className="proForm">
              <div className="proFieldGrid">
                <label className="proField">
                  <span>Limit same customer in X hours</span>
                  <input defaultValue="24" type="number" />
                </label>
                <label className="proField">
                  <span>Max orders in that window</span>
                  <input defaultValue="1" type="number" />
                </label>
              </div>
              <div className="proFieldGrid">
                <label className="proCheck"><input type="checkbox" defaultChecked /><span>Identify by IP address</span></label>
                <label className="proCheck"><input type="checkbox" defaultChecked /><span>Identify by phone</span></label>
                <label className="proCheck"><input type="checkbox" /><span>Identify by email</span></label>
              </div>
              <div className="proFieldGrid">
                <label className="proField">
                  <span>Only 1 order per IP in hours</span>
                  <input defaultValue="24" type="number" />
                </label>
                <label className="proField">
                  <span>Block if quantity exceeds</span>
                  <input defaultValue="5" type="number" />
                </label>
              </div>
              <label className="proField">
                <span>Custom block message</span>
                <input defaultValue="We could not place this COD order. Please contact support." />
              </label>
              <button type="button" className="proButton">Save protection settings</button>
            </div>
          </section>

          <section className="proCard">
            <div className="proCardHeader">
              <div>
                <h2>Blocklists and whitelist</h2>
                <p>One value per line. Phone numbers can be entered without country code.</p>
              </div>
            </div>
            <div className="proForm">
              <label className="proField"><span>Blocked emails</span><textarea placeholder="fraud@example.com" /></label>
              <label className="proField"><span>Blocked phone numbers</span><textarea placeholder="9876543210" /></label>
              <label className="proField"><span>Blocked IP addresses</span><textarea placeholder="192.168.1.1" /></label>
              <label className="proField"><span>Allowed IP addresses</span><textarea placeholder="Office / support IP whitelist" /></label>
            </div>
          </section>
        </div>

        <section className="proCard">
          <div className="proCardHeader">
            <div>
              <span className="proEyebrow">Custom rules</span>
              <h2>Rule engine</h2>
              <p>Create risk rules for postal codes, cart value, buyer behavior, or operational review.</p>
            </div>
          </div>

          <Form method="post" className="proInlineForm">
            <input type="hidden" name="intent" value="create" />
            <input name="name" placeholder="Rule name" />
            <input name="ruleType" placeholder="IP / phone / quantity / zone" />
            <input name="threshold" placeholder="Threshold" />
            <input name="actionLabel" placeholder="Block / require OTP / review" />
            <button type="submit" className="proButton">Create rule</button>
          </Form>

          {actionData ? (
            <p className={actionData.status === "success" ? "successText" : "errorText"}>
              {actionData.message}
            </p>
          ) : null}

          <div className="proTable">
            <div className="proTableRow proTableHead">
              <span>Rule</span>
              <span>Type</span>
              <span>Action</span>
              <span>Status</span>
            </div>
            {fraudRules.map((rule) => (
              <div className="proTableRow" key={rule.id}>
                <span><strong>{rule.name}</strong><small>{rule.threshold}</small></span>
                <span>{rule.ruleType}</span>
                <span>{rule.action}</span>
                <span className="proTableActions">
                  <Form method="post">
                    <input type="hidden" name="intent" value="toggle" />
                    <input type="hidden" name="id" value={rule.id} />
                    <input type="hidden" name="current" value={String(rule.active)} />
                    <button type="submit" className="proTextButton">
                      {rule.active ? "Pause" : "Activate"}
                    </button>
                  </Form>
                  <Form method="post">
                    <input type="hidden" name="intent" value="delete" />
                    <input type="hidden" name="id" value={rule.id} />
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
