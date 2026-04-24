-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "shop" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "isOnline" BOOLEAN NOT NULL DEFAULT false,
    "scope" TEXT,
    "expires" TIMESTAMP(3),
    "accessToken" TEXT NOT NULL,
    "userId" BIGINT,
    "firstName" TEXT,
    "lastName" TEXT,
    "email" TEXT,
    "accountOwner" BOOLEAN NOT NULL DEFAULT false,
    "locale" TEXT,
    "collaborator" BOOLEAN DEFAULT false,
    "emailVerified" BOOLEAN DEFAULT false,
    "refreshToken" TEXT,
    "refreshTokenExpires" TIMESTAMP(3),

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FunnelProfile" (
    "id" SERIAL NOT NULL,
    "shop" TEXT NOT NULL,
    "brandName" TEXT NOT NULL,
    "defaultCurrency" TEXT NOT NULL DEFAULT 'USD',
    "supportEmail" TEXT NOT NULL DEFAULT 'info.ourcares@gmail.com',
    "supportWhatsapp" TEXT,
    "tutorialUrl" TEXT NOT NULL DEFAULT 'https://www.youtube.com/results?search_query=shopify+cod+form+tutorial',
    "otpEnabled" BOOLEAN NOT NULL DEFAULT true,
    "upsellEnabled" BOOLEAN NOT NULL DEFAULT true,
    "fraudShieldLevel" TEXT NOT NULL DEFAULT 'balanced',
    "formTitle" TEXT NOT NULL DEFAULT 'Quick COD Checkout',
    "formSubtitle" TEXT NOT NULL DEFAULT 'Fill your delivery details and place your COD order in seconds.',
    "submitButtonLabel" TEXT NOT NULL DEFAULT 'Place COD Order',
    "successMessage" TEXT NOT NULL DEFAULT 'Your COD order request has been received.',
    "themeColor" TEXT NOT NULL DEFAULT '#1d4ed8',
    "launcherBgColor" TEXT NOT NULL DEFAULT '#111111',
    "launcherTextColor" TEXT NOT NULL DEFAULT '#ffffff',
    "headerBgColor" TEXT NOT NULL DEFAULT '#111827',
    "headerTextColor" TEXT NOT NULL DEFAULT '#ffffff',
    "modalBgColor" TEXT NOT NULL DEFAULT '#f8fafc',
    "cardBgColor" TEXT NOT NULL DEFAULT '#ffffff',
    "textColor" TEXT NOT NULL DEFAULT '#0f172a',
    "mutedTextColor" TEXT NOT NULL DEFAULT '#475569',
    "inputBgColor" TEXT NOT NULL DEFAULT '#ffffff',
    "inputTextColor" TEXT NOT NULL DEFAULT '#111827',
    "inputBorderColor" TEXT NOT NULL DEFAULT '#d7dee8',
    "summaryBgColor" TEXT NOT NULL DEFAULT '#eef2f7',
    "buttonBgColor" TEXT NOT NULL DEFAULT '#111111',
    "buttonTextColor" TEXT NOT NULL DEFAULT '#ffffff',
    "borderRadius" INTEGER NOT NULL DEFAULT 18,
    "collectAddress" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FunnelProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Offer" (
    "id" SERIAL NOT NULL,
    "funnelProfileId" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "trigger" TEXT NOT NULL,
    "upliftPercent" DOUBLE PRECISION,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Offer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FraudRule" (
    "id" SERIAL NOT NULL,
    "funnelProfileId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "ruleType" TEXT NOT NULL,
    "threshold" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FraudRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Automation" (
    "id" SERIAL NOT NULL,
    "funnelProfileId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "destination" TEXT NOT NULL,
    "event" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Automation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CodFormField" (
    "id" SERIAL NOT NULL,
    "funnelProfileId" INTEGER NOT NULL,
    "label" TEXT NOT NULL,
    "fieldKey" TEXT NOT NULL,
    "fieldType" TEXT NOT NULL,
    "placeholder" TEXT,
    "required" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CodFormField_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CodSubmission" (
    "id" SERIAL NOT NULL,
    "funnelProfileId" INTEGER NOT NULL,
    "shop" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'received',
    "customerName" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "address1" TEXT,
    "city" TEXT,
    "notes" TEXT,
    "productTitle" TEXT NOT NULL,
    "variantId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "draftOrderId" TEXT,
    "totalAmount" DOUBLE PRECISION,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "payloadJson" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CodSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FunnelProfile_shop_key" ON "FunnelProfile"("shop");

-- AddForeignKey
ALTER TABLE "Offer" ADD CONSTRAINT "Offer_funnelProfileId_fkey" FOREIGN KEY ("funnelProfileId") REFERENCES "FunnelProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FraudRule" ADD CONSTRAINT "FraudRule_funnelProfileId_fkey" FOREIGN KEY ("funnelProfileId") REFERENCES "FunnelProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Automation" ADD CONSTRAINT "Automation_funnelProfileId_fkey" FOREIGN KEY ("funnelProfileId") REFERENCES "FunnelProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CodFormField" ADD CONSTRAINT "CodFormField_funnelProfileId_fkey" FOREIGN KEY ("funnelProfileId") REFERENCES "FunnelProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CodSubmission" ADD CONSTRAINT "CodSubmission_funnelProfileId_fkey" FOREIGN KEY ("funnelProfileId") REFERENCES "FunnelProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
