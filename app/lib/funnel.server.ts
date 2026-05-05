import prisma from "../db.server";

type SessionShop = {
  shop: string;
};

const defaultOffers: Array<{
  title: string;
  type: string;
  trigger: string;
  upliftPercent: number | null;
  active: boolean;
}> = [];

const defaultFraudRules: Array<{
  name: string;
  ruleType: string;
  threshold: string;
  action: string;
  active: boolean;
}> = [];

const defaultAutomations: Array<{
  name: string;
  destination: string;
  event: string;
  active: boolean;
}> = [];

const defaultFormFields = [
  {
    label: "Full name",
    fieldKey: "customerName",
    fieldType: "text",
    placeholder: "Enter your full name",
    required: true,
    sortOrder: 1,
    active: true
  },
  {
    label: "Phone number",
    fieldKey: "phone",
    fieldType: "tel",
    placeholder: "03xx xxx xxxx",
    required: true,
    sortOrder: 2,
    active: true
  },
  {
    label: "Email",
    fieldKey: "email",
    fieldType: "email",
    placeholder: "Optional email",
    required: false,
    sortOrder: 3,
    active: true
  },
  {
    label: "Address",
    fieldKey: "address1",
    fieldType: "text",
    placeholder: "House no, street, area",
    required: true,
    sortOrder: 4,
    active: true
  },
  {
    label: "City",
    fieldKey: "city",
    fieldType: "text",
    placeholder: "Enter your city",
    required: true,
    sortOrder: 5,
    active: true
  },
  {
    label: "Order notes",
    fieldKey: "notes",
    fieldType: "textarea",
    placeholder: "Any special request",
    required: false,
    sortOrder: 6,
    active: true
  }
];

async function backfillDefaultFormFields(profileId: number) {
  const existingFields = await prisma.codFormField.findMany({
    where: { funnelProfileId: profileId },
    orderBy: { sortOrder: "asc" }
  });

  const existingKeys = new Set(existingFields.map((field) => field.fieldKey));
  const missingFields = defaultFormFields.filter((field) => !existingKeys.has(field.fieldKey));

  if (!missingFields.length) {
    return;
  }

  const lastSortOrder = existingFields.at(-1)?.sortOrder ?? 0;

  await prisma.codFormField.createMany({
    data: missingFields.map((field, index) => ({
      funnelProfileId: profileId,
      label: field.label,
      fieldKey: field.fieldKey,
      fieldType: field.fieldType,
      placeholder: field.placeholder,
      required: field.required,
      active: true,
      sortOrder: lastSortOrder + index + 1
    }))
  });
}

export async function ensureFunnelProfile({
  shop
}: SessionShop) {
  const existing = await prisma.funnelProfile.findUnique({
    where: { shop },
    include: {
      offers: true,
      fraudRules: true,
      automations: true,
      formFields: {
        orderBy: { sortOrder: "asc" }
      },
      submissions: {
        orderBy: { createdAt: "desc" },
        take: 10
      }
    }
  });

  if (existing) return existing;

  return prisma.funnelProfile.create({
    data: {
      shop,
      brandName: shop.replace(".myshopify.com", ""),
      offers: { create: defaultOffers },
      fraudRules: { create: defaultFraudRules },
      automations: { create: defaultAutomations },
      formFields: { create: defaultFormFields }
    },
    include: {
      offers: true,
      fraudRules: true,
      automations: true,
      formFields: {
        orderBy: { sortOrder: "asc" }
      },
      submissions: {
        orderBy: { createdAt: "desc" },
        take: 10
      }
    }
  });
}

export async function getFunnelProfile(shop: string) {
  const ensuredProfile = await ensureFunnelProfile({ shop });
  await backfillDefaultFormFields(ensuredProfile.id);

  return prisma.funnelProfile.findUniqueOrThrow({
    where: { shop },
    include: {
      offers: {
        orderBy: { updatedAt: "desc" }
      },
      formFields: {
        orderBy: { sortOrder: "asc" }
      },
      fraudRules: {
        orderBy: { updatedAt: "desc" }
      },
      automations: {
        orderBy: { updatedAt: "desc" }
      },
      submissions: {
        orderBy: { createdAt: "desc" },
        take: 10
      }
    }
  });
}

export function getCurrentMonthStart(now = new Date()) {
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

export async function getMonthlySubmissionCount(shop: string) {
  return prisma.codSubmission.count({
    where: {
      shop,
      createdAt: {
        gte: getCurrentMonthStart()
      }
    }
  });
}

export async function getFunnelSummary(shop: string) {
  const profile = await getFunnelProfile(shop);
  const [totalSubmissions, monthlySubmissions] = await Promise.all([
    prisma.codSubmission.count({ where: { shop } }),
    getMonthlySubmissionCount(shop)
  ]);

  return {
    profile,
    stats: {
      offers: profile.offers.length,
      activeOffers: profile.offers.filter((item) => item.active).length,
      fraudRules: profile.fraudRules.length,
      activeFraudRules: profile.fraudRules.filter((item) => item.active).length,
      automations: profile.automations.length,
      activeAutomations: profile.automations.filter((item) => item.active).length,
      formFields: profile.formFields.length,
      activeFormFields: profile.formFields.filter((item) => item.active).length,
      submissions: totalSubmissions,
      monthlySubmissions
    }
  };
}
