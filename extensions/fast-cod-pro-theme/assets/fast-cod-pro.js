(function () {
  function applyDesign(container, design, accentColor) {
    var merged = Object.assign(
      {
        launcherBgColor: "#111111",
        launcherTextColor: "#ffffff",
        launcherIcon: "🛒",
        launcherAnimation: "none",
        buttonBgColor: "#111111",
        buttonTextColor: "#ffffff",
        borderRadius: 18
      },
      design || {}
    );

    container.style.setProperty("--fast-cod-accent", accentColor || "#1d4ed8");
    container.style.setProperty("--fast-cod-launcher-bg", merged.launcherBgColor || merged.buttonBgColor);
    container.style.setProperty("--fast-cod-launcher-text", merged.launcherTextColor || merged.buttonTextColor);
    container.style.setProperty("--fast-cod-primary-bg", merged.buttonBgColor);
    container.style.setProperty("--fast-cod-primary-text", merged.buttonTextColor);
    container.style.setProperty("--fast-cod-radius", Math.max(8, Number(merged.borderRadius || 18)) + "px");
  }

  function applyLauncherAnimation(launcher, animation) {
    if (!launcher) return;
    launcher.classList.remove(
      "fast-cod-pro-launcher--shaker",
      "fast-cod-pro-launcher--bounce",
      "fast-cod-pro-launcher--pulse"
    );
    if (animation === "shaker" || animation === "bounce" || animation === "pulse") {
      launcher.classList.add("fast-cod-pro-launcher--" + animation);
    }
  }

  function ensureHideStyle() {
    if (document.getElementById("fast-cod-pro-hide-style")) return;
    var style = document.createElement("style");
    style.id = "fast-cod-pro-hide-style";
    style.textContent = [
      "body.fast-cod-pro-enabled .shopify-payment-button,",
      "body.fast-cod-pro-enabled .shopify-payment-button__button,",
      "body.fast-cod-pro-enabled .product-form__buttons > *:not([data-fast-cod-pro-root]),",
      "body.fast-cod-pro-enabled product-form button[type='submit']:not(.fast-cod-pro-button),",
      "body.fast-cod-pro-enabled form[action*='/cart/add'] button[type='submit']:not(.fast-cod-pro-button),",
      "body.fast-cod-pro-enabled .product-form__submit { display:none !important; }"
    ].join("");
    document.head.appendChild(style);
  }

  function hideNativePurchaseUi() {
    ensureHideStyle();
    document.body.classList.add("fast-cod-pro-enabled");
    document
      .querySelectorAll(
        [
          ".shopify-payment-button",
          ".shopify-payment-button__button",
          ".product-form__submit",
          "product-form button[type='submit']:not(.fast-cod-pro-button)",
          "form[action*='/cart/add'] button[type='submit']:not(.fast-cod-pro-button)"
        ].join(",")
      )
      .forEach(function (node) {
        node.style.display = "none";
      });
  }

  function watchNativePurchaseUi() {
    if (window.__fastCodObserver) return;
    window.__fastCodObserver = new MutationObserver(function () {
      hideNativePurchaseUi();
    });
    window.__fastCodObserver.observe(document.body, { childList: true, subtree: true });
  }

  function getCurrentVariantId(container) {
    var productFormVariant = document.querySelector('form[action*="/cart/add"] [name="id"]');
    return String((productFormVariant && productFormVariant.value) || container.dataset.variantId || "").replace(/\D/g, "");
  }

  async function getAvailableVariantId(container, preferredVariantId) {
    var handle = container.dataset.productHandle;
    if (!handle) return preferredVariantId;

    try {
      var response = await fetch("/products/" + encodeURIComponent(handle) + ".js", {
        cache: "no-store",
        headers: { Accept: "application/json" }
      });
      if (!response.ok) return preferredVariantId;

      var product = await response.json();
      var variants = product && Array.isArray(product.variants) ? product.variants : [];
      var preferred = variants.find(function (variant) {
        return String(variant.id) === String(preferredVariantId) && variant.available !== false;
      });
      var available = preferred || variants.find(function (variant) {
        return variant.available !== false;
      });

      if (available && available.id) {
        container.dataset.variantId = String(available.id);
        return String(available.id);
      }
    } catch (error) {
      console.error("Fast COD Pro available variant lookup failed", error);
    }

    return preferredVariantId;
  }

  function getCurrentQuantity(container) {
    var productFormQuantity = document.querySelector('form[action*="/cart/add"] [name="quantity"]');
    var quantity = Number((productFormQuantity && productFormQuantity.value) || container.dataset.quantity || 1);
    return Math.max(1, Number.isFinite(quantity) ? quantity : 1);
  }

  async function addVariantToCart(variantId, quantity) {
    return fetch("/cart/add.js", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json"
      },
      body: JSON.stringify({
        items: [
          {
            id: Number(variantId),
            quantity: quantity,
            properties: {
              _fast_cod_pro: "Continue through Shopify Checkout"
            }
          }
        ]
      })
    });
  }

  async function addToCartAndCheckout(container, status, button) {
    var selectedVariantId = getCurrentVariantId(container);
    var variantId = await getAvailableVariantId(container, selectedVariantId);
    var quantity = getCurrentQuantity(container);

    if (!variantId) {
      throw new Error("Please select a product variant first.");
    }

    var response = await addVariantToCart(variantId, quantity);

    if (!response.ok && String(variantId) === String(selectedVariantId)) {
      var fallbackVariantId = await getAvailableVariantId(container, "");
      if (fallbackVariantId && String(fallbackVariantId) !== String(variantId)) {
        response = await addVariantToCart(fallbackVariantId, quantity);
      }
    }

    if (!response.ok) {
      var text = await response.text();
      throw new Error(text || "Could not add this product to cart.");
    }

    status.hidden = false;
    status.textContent = "Opening secure Shopify Checkout...";
    status.style.color = "#047857";
    button.textContent = "Opening Shopify Checkout...";
    window.location.href = "/checkout";
  }

  async function enhanceButton(container) {
    try {
      var endpoint = container.dataset.configUrl;
      if (!endpoint) return;
      var configUrl = new URL(endpoint, window.location.origin);
      configUrl.searchParams.set("_fast_cod_ts", String(Date.now()));
      var response = await fetch(configUrl.toString(), {
        cache: "no-store",
        headers: { Accept: "application/json" }
      });
      if (!response.ok) return;
      var payload = await response.json();
      var formConfig = payload.form || {};
      var launcher = container.querySelector(".fast-cod-pro-launcher");
      var launcherIcon = container.querySelector(".fast-cod-pro-launcher-icon");
      var launcherLabel = container.querySelector(".fast-cod-pro-launcher-label");

      if (launcherIcon) {
        launcherIcon.textContent = formConfig.design && typeof formConfig.design.launcherIcon === "string" ? formConfig.design.launcherIcon : "🛒";
        launcherIcon.hidden = !launcherIcon.textContent;
      }
      if (launcherLabel) launcherLabel.textContent = formConfig.submitButtonLabel || "Continue to Shopify Checkout";
      applyDesign(container, formConfig.design, formConfig.themeColor || container.dataset.accent);
      applyLauncherAnimation(launcher, formConfig.design && formConfig.design.launcherAnimation);
    } catch (error) {
      console.error("Fast COD Pro config fetch failed", error);
    }
  }

  async function init(container) {
    if (container.dataset.fastCodInitialized === "true") return;
    container.dataset.fastCodInitialized = "true";

    hideNativePurchaseUi();
    watchNativePurchaseUi();
    applyDesign(container, null, container.dataset.accent);

    var launcher = container.querySelector(".fast-cod-pro-launcher");
    var status = container.querySelector(".fast-cod-pro-status");
    if (!launcher) {
      container.innerHTML =
        '<div class="fast-cod-pro-launcher-card fast-cod-pro-launcher-card--button-only">' +
        '<button class="fast-cod-pro-launcher fast-cod-pro-button" type="button">' +
        '<span class="fast-cod-pro-launcher-icon">🛒</span>' +
        '<span class="fast-cod-pro-launcher-label">Continue to Shopify Checkout</span>' +
        "</button>" +
        "</div>" +
        '<div class="fast-cod-pro-status" hidden></div>';
      launcher = container.querySelector(".fast-cod-pro-launcher");
      status = container.querySelector(".fast-cod-pro-status");
    }

    if (status) status.textContent = "";
    launcher.classList.add("fast-cod-pro-button");
    launcher.removeAttribute("onclick");
    launcher.setAttribute("type", "button");
    launcher.addEventListener("click", async function (event) {
      event.preventDefault();
      event.stopPropagation();
      if (launcher.disabled) return;

      launcher.disabled = true;
      if (status) {
        status.hidden = false;
        status.textContent = "Adding product to cart...";
        status.style.color = "#0f172a";
      }

      try {
        await addToCartAndCheckout(container, status || document.createElement("div"), launcher);
      } catch (error) {
        if (status) {
          status.hidden = false;
          status.textContent = error && error.message ? error.message : "Could not open Shopify Checkout.";
          status.style.color = "#b91c1c";
        }
        launcher.disabled = false;
      }
    });

    await enhanceButton(container);
  }

  function initAll() {
    document.querySelectorAll("[data-fast-cod-pro-root]").forEach(function (node) {
      init(node).catch(function (error) {
        console.error("Fast COD Pro checkout button failed to initialize", error);
      });
    });
  }

  initAll();
  document.addEventListener("shopify:section:load", initAll);
})();
