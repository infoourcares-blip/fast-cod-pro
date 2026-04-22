-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_FunnelProfile" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
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
    "submitButtonLabel" TEXT NOT NULL DEFAULT 'Place COD Order',
    "successMessage" TEXT NOT NULL DEFAULT 'Your COD order request has been received.',
    "themeColor" TEXT NOT NULL DEFAULT '#1d4ed8',
    "collectAddress" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_FunnelProfile" ("brandName", "collectAddress", "createdAt", "defaultCurrency", "formTitle", "fraudShieldLevel", "id", "otpEnabled", "shop", "submitButtonLabel", "successMessage", "themeColor", "updatedAt", "upsellEnabled") SELECT "brandName", "collectAddress", "createdAt", "defaultCurrency", "formTitle", "fraudShieldLevel", "id", "otpEnabled", "shop", "submitButtonLabel", "successMessage", "themeColor", "updatedAt", "upsellEnabled" FROM "FunnelProfile";
DROP TABLE "FunnelProfile";
ALTER TABLE "new_FunnelProfile" RENAME TO "FunnelProfile";
CREATE UNIQUE INDEX "FunnelProfile_shop_key" ON "FunnelProfile"("shop");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
