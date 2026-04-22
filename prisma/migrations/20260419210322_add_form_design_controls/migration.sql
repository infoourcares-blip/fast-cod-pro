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
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_FunnelProfile" ("brandName", "collectAddress", "createdAt", "defaultCurrency", "formTitle", "fraudShieldLevel", "id", "otpEnabled", "shop", "submitButtonLabel", "successMessage", "supportEmail", "supportWhatsapp", "themeColor", "tutorialUrl", "updatedAt", "upsellEnabled") SELECT "brandName", "collectAddress", "createdAt", "defaultCurrency", "formTitle", "fraudShieldLevel", "id", "otpEnabled", "shop", "submitButtonLabel", "successMessage", "supportEmail", "supportWhatsapp", "themeColor", "tutorialUrl", "updatedAt", "upsellEnabled" FROM "FunnelProfile";
DROP TABLE "FunnelProfile";
ALTER TABLE "new_FunnelProfile" RENAME TO "FunnelProfile";
CREATE UNIQUE INDEX "FunnelProfile_shop_key" ON "FunnelProfile"("shop");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
