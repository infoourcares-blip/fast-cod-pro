-- CreateTable
CREATE TABLE "CodFormField" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "funnelProfileId" INTEGER NOT NULL,
    "label" TEXT NOT NULL,
    "fieldKey" TEXT NOT NULL,
    "fieldType" TEXT NOT NULL,
    "placeholder" TEXT,
    "required" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CodFormField_funnelProfileId_fkey" FOREIGN KEY ("funnelProfileId") REFERENCES "FunnelProfile" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CodSubmission" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
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
    "totalAmount" REAL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "payloadJson" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CodSubmission_funnelProfileId_fkey" FOREIGN KEY ("funnelProfileId") REFERENCES "FunnelProfile" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_FunnelProfile" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "shop" TEXT NOT NULL,
    "brandName" TEXT NOT NULL,
    "defaultCurrency" TEXT NOT NULL DEFAULT 'USD',
    "otpEnabled" BOOLEAN NOT NULL DEFAULT true,
    "upsellEnabled" BOOLEAN NOT NULL DEFAULT true,
    "fraudShieldLevel" TEXT NOT NULL DEFAULT 'balanced',
    "formTitle" TEXT NOT NULL DEFAULT 'Quick COD Checkout',
    "submitButtonLabel" TEXT NOT NULL DEFAULT 'Place COD Order',
    "successMessage" TEXT NOT NULL DEFAULT 'Your COD order request has been received.',
    "themeColor" TEXT NOT NULL DEFAULT '#1d4ed8',
    "collectAddress" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_FunnelProfile" ("brandName", "createdAt", "defaultCurrency", "fraudShieldLevel", "id", "otpEnabled", "shop", "updatedAt", "upsellEnabled") SELECT "brandName", "createdAt", "defaultCurrency", "fraudShieldLevel", "id", "otpEnabled", "shop", "updatedAt", "upsellEnabled" FROM "FunnelProfile";
DROP TABLE "FunnelProfile";
ALTER TABLE "new_FunnelProfile" RENAME TO "FunnelProfile";
CREATE UNIQUE INDEX "FunnelProfile_shop_key" ON "FunnelProfile"("shop");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
