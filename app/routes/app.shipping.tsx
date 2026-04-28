import { Form } from "react-router";

const shippingRules = [
  { name: "Free COD shipping", basis: "Price", condition: "Order above 999", rate: "Free", status: "Active" },
  { name: "Metro express", basis: "Location", condition: "Delhi, Mumbai, Bengaluru", rate: "INR 49", status: "Active" },
  { name: "Heavy parcel fee", basis: "Weight", condition: "Above 2 kg", rate: "INR 89", status: "Draft" },
];

export default function ShippingRoute() {
  return (
    <s-page heading="Shipping Settings">
      <div className="proShell">
        <section className="proHero proHeroCompact">
          <div>
            <span className="proEyebrow">Shipping rules</span>
            <h1>Charge the right COD shipping rate every time.</h1>
            <p>
              Build rules by order value, product weight, and customer location. These settings are ready for checkout and app proxy enforcement.
            </p>
          </div>
          <button type="button" className="proButton">Add shipping rule</button>
        </section>

        <div className="proGridTwo">
          <section className="proCard">
            <div className="proCardHeader">
              <div>
                <h2>Rule builder</h2>
                <p>Beginner-friendly controls for COD delivery pricing.</p>
              </div>
            </div>
            <Form className="proForm">
              <label className="proField">
                <span>Rule name</span>
                <input name="name" placeholder="Free shipping over 999" />
              </label>
              <div className="proFieldGrid">
                <label className="proField">
                  <span>Based on</span>
                  <select name="basis" defaultValue="price">
                    <option value="price">Price</option>
                    <option value="weight">Weight</option>
                    <option value="location">Location</option>
                  </select>
                </label>
                <label className="proField">
                  <span>Rate</span>
                  <input name="rate" placeholder="INR 49" />
                </label>
              </div>
              <label className="proField">
                <span>Condition</span>
                <input name="condition" placeholder="Order above 999, Mumbai, above 2kg" />
              </label>
              <label className="proCheck">
                <input type="checkbox" defaultChecked />
                <span>Show shipping rate inside fast COD form</span>
              </label>
              <button type="button" className="proButton">Save rule</button>
            </Form>
          </section>

          <section className="proCard">
            <div className="proCardHeader">
              <div>
                <h2>Live rates</h2>
                <p>Rates your COD form can show before order submission.</p>
              </div>
            </div>
            <div className="proTable">
              <div className="proTableRow proTableHead">
                <span>Name</span>
                <span>Basis</span>
                <span>Rate</span>
                <span>Status</span>
              </div>
              {shippingRules.map((rule) => (
                <div className="proTableRow" key={rule.name}>
                  <span>
                    <strong>{rule.name}</strong>
                    <small>{rule.condition}</small>
                  </span>
                  <span>{rule.basis}</span>
                  <span>{rule.rate}</span>
                  <span className={rule.status === "Active" ? "proStatusOn" : "proStatusMuted"}>{rule.status}</span>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </s-page>
  );
}
