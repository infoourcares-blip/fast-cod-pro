import prisma from "../db.server";

export async function purgeShopData(shop: string) {
  await prisma.$transaction([
    prisma.session.deleteMany({ where: { shop } }),
    prisma.funnelProfile.deleteMany({ where: { shop } }),
  ]);
}

export async function findCustomerData(shop: string, customerEmail?: string | null) {
  const profile = await prisma.funnelProfile.findUnique({
    where: { shop },
    include: {
      submissions: {
        where: customerEmail ? { email: customerEmail } : undefined,
        orderBy: { createdAt: "desc" },
      },
    },
  });

  return {
    shop,
    customerEmail: customerEmail ?? null,
    submissionCount: profile?.submissions.length ?? 0,
    submissions:
      profile?.submissions.map((submission) => ({
        id: submission.id,
        status: submission.status,
        productTitle: submission.productTitle,
        createdAt: submission.createdAt.toISOString(),
        phone: submission.phone,
        city: submission.city,
        address1: submission.address1,
        notes: submission.notes,
      })) ?? [],
  };
}

export async function redactCustomerData(shop: string, customerEmail?: string | null) {
  if (!customerEmail) {
    return { count: 0 };
  }

  const profile = await prisma.funnelProfile.findUnique({
    where: { shop },
    select: { id: true },
  });

  if (!profile) {
    return { count: 0 };
  }

  const result = await prisma.codSubmission.updateMany({
    where: {
      funnelProfileId: profile.id,
      email: customerEmail,
    },
    data: {
      customerName: "Redacted customer",
      phone: "REDACTED",
      email: null,
      address1: null,
      city: null,
      notes: null,
      payloadJson: null,
    },
  });

  return { count: result.count };
}
