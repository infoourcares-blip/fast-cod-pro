(function () {
  function escapeHtml(value) {
    return String(value || "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }

  function defaultFields() {
    return [
      { key: "customerName", label: "Full name", placeholder: "Full name", type: "text", required: true },
      { key: "phone", label: "Phone number", placeholder: "Phone", type: "tel", required: true },
      { key: "address1", label: "Address", placeholder: "Address", type: "text", required: true },
      { key: "pincode", label: "Pincode", placeholder: "Pincode", type: "text", required: true },
      { key: "city", label: "City", placeholder: "City", type: "text", required: false }
    ];
  }

  function fieldIcon(fieldKey) {
    if (fieldKey === "customerName") return "👤";
    if (fieldKey === "phone") return "☎";
    if (fieldKey === "address1") return "📍";
    if (fieldKey === "city") return "🏙";
    if (fieldKey === "pincode") return "#";
    return "";
  }

  function fieldMarkup(field) {
    var icon = fieldIcon(field.key);
    return (
      '<label class="fast-cod-pro-field">' +
      '<span class="fast-cod-pro-label">' + escapeHtml(field.label) + (field.required ? ' <em>*</em>' : "") + "</span>" +
      '<span class="fast-cod-pro-input-wrap">' +
      (icon ? '<span class="fast-cod-pro-input-icon">' + icon + "</span>" : "") +
      '<input name="' + escapeHtml(field.key) + '" type="' + escapeHtml(field.type || "text") + '" placeholder="' + escapeHtml(field.placeholder || "") + '"' + (field.required ? " required" : "") + ">" +
      "</span>" +
      "</label>"
    );
  }

  function applyDesign(container, design, accentColor) {
    var merged = Object.assign(
      {
        launcherBgColor: "#111111",
        launcherTextColor: "#ffffff",
        headerBgColor: "#111827",
        headerTextColor: "#ffffff",
        modalBgColor: "#f8fafc",
        cardBgColor: "#ffffff",
        textColor: "#0f172a",
        mutedTextColor: "#475569",
        inputBgColor: "#ffffff",
        inputTextColor: "#111827",
        inputBorderColor: "#d7dee8",
        summaryBgColor: "#eef2f7",
        buttonBgColor: "#111111",
        buttonTextColor: "#ffffff",
        borderRadius: 18
      },
      design || {}
    );

    container.style.setProperty("--fast-cod-accent", accentColor || "#1d4ed8");
    container.style.setProperty("--fast-cod-launcher-bg", merged.launcherBgColor);
    container.style.setProperty("--fast-cod-launcher-text", merged.launcherTextColor);
    container.style.setProperty("--fast-cod-header-bg", merged.headerBgColor);
    container.style.setProperty("--fast-cod-header-text", merged.headerTextColor);
    container.style.setProperty("--fast-cod-modal-bg", merged.modalBgColor);
    container.style.setProperty("--fast-cod-surface-bg", merged.cardBgColor);
    container.style.setProperty("--fast-cod-text", merged.textColor);
    container.style.setProperty("--fast-cod-muted", merged.mutedTextColor);
    container.style.setProperty("--fast-cod-input-bg", merged.inputBgColor);
    container.style.setProperty("--fast-cod-input-text", merged.inputTextColor);
    container.style.setProperty("--fast-cod-input-border", merged.inputBorderColor);
    container.style.setProperty("--fast-cod-summary-bg", merged.summaryBgColor);
    container.style.setProperty("--fast-cod-primary-bg", merged.buttonBgColor);
    container.style.setProperty("--fast-cod-primary-text", merged.buttonTextColor);
    container.style.setProperty("--fast-cod-radius", Math.max(8, Number(merged.borderRadius || 18)) + "px");
  }

  function ensureHideStyle() {
    if (document.getElementById("fast-cod-pro-hide-style")) return;
    var style = document.createElement("style");
    style.id = "fast-cod-pro-hide-style";
    style.textContent = [
      "body.fast-cod-pro-enabled .shopify-payment-button,",
      "body.fast-cod-pro-enabled .shopify-payment-button__button,",
      "body.fast-cod-pro-enabled .product-form__buttons > *:not([data-fast-cod-pro-root]),",
      "body.fast-cod-pro-enabled product-form button[type='submit'],",
      "body.fast-cod-pro-enabled form[action*='/cart/add'] button[type='submit'],",
      "body.fast-cod-pro-enabled .product-form__submit { display:none !important; }"
    ].join("");
    document.head.appendChild(style);
  }

  function hideNativePurchaseUi() {
    ensureHideStyle();
    document.body.classList.add("fast-cod-pro-enabled");

    var selectors = [
      ".shopify-payment-button",
      ".shopify-payment-button__button",
      ".product-form__submit",
      "product-form button[type='submit']",
      "form[action*='/cart/add'] button[type='submit']"
    ];

    document.querySelectorAll(selectors.join(",")).forEach(function (node) {
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

  function buildModalHtml(productTitle, productImage, displayPrice, variantId, price) {
    return (
      '<div class="fast-cod-pro-modal" hidden>' +
      '<div class="fast-cod-pro-backdrop" data-fast-cod-close onclick="var modal=this.closest(\'.fast-cod-pro-modal\');if(modal){modal.hidden=true;document.body.classList.remove(\'fast-cod-pro-modal-open\');}"></div>' +
      '<div class="fast-cod-pro-sheet" role="dialog" aria-modal="true" aria-label="Cash on Delivery">' +
      '<div class="fast-cod-pro-sheet-head">' +
      '<div class="fast-cod-pro-sheet-title"><span class="fast-cod-pro-home-icon">⌂</span><strong>Cash on Delivery</strong></div>' +
      '<button class="fast-cod-pro-close" type="button" data-fast-cod-close onclick="var modal=this.closest(\'.fast-cod-pro-modal\');if(modal){modal.hidden=true;document.body.classList.remove(\'fast-cod-pro-modal-open\');}">×</button>' +
      "</div>" +
      '<div class="fast-cod-pro-sheet-body">' +
      '<div class="fast-cod-pro-summary-card">' +
      '<div class="fast-cod-pro-summary-row">' +
      (productImage ? '<img class="fast-cod-pro-summary-image" src="' + escapeHtml(productImage) + '" alt="' + escapeHtml(productTitle) + '">' : '<div class="fast-cod-pro-summary-image fast-cod-pro-summary-image--placeholder"></div>') +
      '<div class="fast-cod-pro-summary-meta">' +
      '<strong>' + escapeHtml(productTitle) + "</strong>" +
      '<span>' + escapeHtml(displayPrice) + "</span>" +
      '<div class="fast-cod-pro-qty-control">' +
      '<button type="button" data-qty-change="-1">−</button>' +
      '<input name="quantityDisplay" value="1" readonly>' +
      '<button type="button" data-qty-change="1">+</button>' +
      "</div>" +
      "</div>" +
      "</div>" +
      "</div>" +
      '<div class="fast-cod-pro-total-card">' +
      '<div class="fast-cod-pro-total-line"><span>Subtotal</span><strong class="fast-cod-pro-subtotal">' + escapeHtml(displayPrice) + "</strong></div>" +
      '<div class="fast-cod-pro-total-line"><span>Shipping</span><strong>Free</strong></div>' +
      '<div class="fast-cod-pro-total-line fast-cod-pro-total-line--grand"><span>Total</span><strong class="fast-cod-pro-total">' + escapeHtml(displayPrice) + "</strong></div>' +
      "</div>" +
      '<div class="fast-cod-pro-grid" data-fast-cod-form>' +
      '<h3 class="fast-cod-pro-form-title">Enter your shipping address</h3>' +
      defaultFields().map(fieldMarkup).join("") +
      '<input type="hidden" name="quantity" value="1">' +
      '<input type="hidden" name="variantId" value="' + escapeHtml(variantId) + '">' +
      '<input type="hidden" name="productTitle" value="' + escapeHtml(productTitle) + '">' +
      '<input type="hidden" name="price" value="' + escapeHtml(price) + '">' +
      '<button class="fast-cod-pro-button" type="button">Complete Order - ' + escapeHtml(displayPrice) + "</button>" +
      "</div>" +
      '<div class="fast-cod-pro-status" hidden></div>' +
      "</div>" +
      "</div>" +
      "</div>"
    );
  }

  function syncQuantity(container, currency, numericPrice, displayPrice) {
    var quantityInput = container.querySelector('input[name="quantity"]');
    var quantityDisplay = container.querySelector('input[name="quantityDisplay"]');
    var subtotal = container.querySelector(".fast-cod-pro-subtotal");
    var total = container.querySelector(".fast-cod-pro-total");
    var submitButton = container.querySelector(".fast-cod-pro-button");
    var quantity = Math.max(1, Number(quantityInput.value || 1));
    var amount = numericPrice ? currency + " " + (numericPrice * quantity).toFixed(2) : displayPrice;

    quantityInput.value = String(quantity);
    quantityDisplay.value = String(quantity);
    subtotal.textContent = amount;
    total.textContent = amount;
    submitButton.textContent = "Complete Order - " + amount;
  }

  async function enhanceFields(container, endpoint, accentColor) {
    try {
      var response = await fetch(endpoint, { headers: { Accept: "application/json" } });
      var payload = await response.json();
      var fields = payload.fields && payload.fields.length ? payload.fields : defaultFields();
      var formConfig = payload.form || {};
      var title = container.querySelector(".fast-cod-pro-form-title");
      var subtitle = container.querySelector(".fast-cod-pro-sheet-title-copy span");
      var form = container.querySelector(".fast-cod-pro-grid");
      var launcherLabel = container.querySelector(".fast-cod-pro-launcher-label");
      var status = container.querySelector(".fast-cod-pro-status");
      var fieldHtml = fields.map(fieldMarkup).join("");
      var existingQuantity = form.querySelector('input[name="quantity"]');
      var existingVariant = form.querySelector('input[name="variantId"]');
      var existingProduct = form.querySelector('input[name="productTitle"]');
      var existingPrice = form.querySelector('input[name="price"]');
      var existingButton = form.querySelector(".fast-cod-pro-button");

      form.innerHTML =
        '<h3 class="fast-cod-pro-form-title">' + escapeHtml(formConfig.title || "Enter your shipping address") + "</h3>" +
        fieldHtml +
        existingQuantity.outerHTML +
        existingVariant.outerHTML +
        existingProduct.outerHTML +
        existingPrice.outerHTML +
        existingButton.outerHTML;

      if (title) title.textContent = formConfig.title || "Enter your shipping address";
      if (subtitle) subtitle.textContent = formConfig.subtitle || "Fast checkout powered by Fast Cod Pro";
      if (launcherLabel) launcherLabel.textContent = formConfig.submitButtonLabel || "Order Now - Cash on Delivery";
      if (status) status.textContent = "";
      applyDesign(container, formConfig.design, accentColor);
    } catch (error) {
      console.error("Fast Cod Pro config fetch failed", error);
    }
  }

  async function init(container) {
    if (container.dataset.fastCodInitialized === "true") return;
    container.dataset.fastCodInitialized = "true";

    var endpoint = container.dataset.configUrl;
    var submitUrl = container.dataset.submitUrl;
    var variantId = container.dataset.variantId || "";
    var currency = container.dataset.currency || "INR";
    var price = container.dataset.price || "";
    var priceDisplay = container.dataset.priceDisplay || "";
    var accentColor = container.dataset.accent || "#1d4ed8";
    var productTitle = container.dataset.productTitle || "Selected product";
    var productImage = container.dataset.productImage || "";
    var displayPrice = priceDisplay || ((currency ? currency + " " : "") + price);
    var numericPrice = parseFloat(String(price).replace(/,/g, "")) || 0;

    hideNativePurchaseUi();
    watchNativePurchaseUi();
    applyDesign(container, null, accentColor);

    var launcher = container.querySelector(".fast-cod-pro-launcher");
    if (!launcher) {
      container.innerHTML = '<div class="fast-cod-pro-launcher-card fast-cod-pro-launcher-card--button-only"><button class="fast-cod-pro-launcher" type="button" onclick="var root=this.closest(\\'[data-fast-cod-pro-root]\\');var modal=root&&root.querySelector(\\'.fast-cod-pro-modal\\');if(modal){modal.hidden=false;document.body.classList.add(\\'fast-cod-pro-modal-open\\');}return false;"><span class="fast-cod-pro-launcher-icon">🛒</span><span class="fast-cod-pro-launcher-label">Order Now - Cash on Delivery</span></button></div>';
      launcher = container.querySelector(".fast-cod-pro-launcher");
    } else if (!launcher.querySelector(".fast-cod-pro-launcher-label")) {
      var label = launcher.textContent || "Order Now - Cash on Delivery";
      launcher.innerHTML = '<span class="fast-cod-pro-launcher-icon">🛒</span><span class="fast-cod-pro-launcher-label">' + escapeHtml(label) + "</span>";
    }

    launcher.setAttribute("onclick", "var root=this.closest('[data-fast-cod-pro-root]');var modal=root&&root.querySelector('.fast-cod-pro-modal');if(modal){modal.hidden=false;document.body.classList.add('fast-cod-pro-modal-open');}return false;");

    if (!container.querySelector(".fast-cod-pro-modal")) {
      container.insertAdjacentHTML("beforeend", buildModalHtml(productTitle, productImage, displayPrice, variantId, price));
    }

    var modal = container.querySelector(".fast-cod-pro-modal");
    var closeButtons = container.querySelectorAll("[data-fast-cod-close]");
    var form = container.querySelector(".fast-cod-pro-grid");
    var status = container.querySelector(".fast-cod-pro-status");
    var qtyButtons = container.querySelectorAll("[data-qty-change]");

    function collectFormData() {
      var body = new URLSearchParams();
      var fields = form.querySelectorAll("input, textarea, select");

      for (var i = 0; i < fields.length; i += 1) {
        var field = fields[i];
        if (field.required && !String(field.value || "").trim()) {
          if (typeof field.reportValidity === "function") field.reportValidity();
          field.focus();
          return null;
        }
        if (field.name) body.append(field.name, field.value);
      }

      return body;
    }

    function openModal() {
      modal.hidden = false;
      document.body.classList.add("fast-cod-pro-modal-open");
    }

    function closeModal() {
      modal.hidden = true;
      document.body.classList.remove("fast-cod-pro-modal-open");
    }

    launcher.addEventListener("click", openModal);
    closeButtons.forEach(function (button) {
      button.addEventListener("click", closeModal);
    });

    qtyButtons.forEach(function (button) {
      button.addEventListener("click", function () {
        var quantityInput = container.querySelector('input[name="quantity"]');
        var delta = Number(button.getAttribute("data-qty-change") || "0");
        quantityInput.value = String(Math.max(1, Number(quantityInput.value || "1") + delta));
        syncQuantity(container, currency, numericPrice, displayPrice);
      });
    });

    async function submitCodOrder(event) {
      event.preventDefault();
      event.stopPropagation();
      var submitButton = container.querySelector(".fast-cod-pro-button");
      status.hidden = false;
      status.textContent = "Submitting COD order...";
      status.style.color = "#0f172a";
      submitButton.disabled = true;

      var body = collectFormData();
      if (!body) {
        status.textContent = "Please fill the required details.";
        status.style.color = "#b91c1c";
        submitButton.disabled = false;
        return;
      }

      try {
        var submitResponse = await fetch(submitUrl + "?" + body.toString(), {
          method: "GET",
          headers: { Accept: "application/json" }
        });
        var responseText = await submitResponse.text();
        var result = {};

        try {
          result = JSON.parse(responseText);
        } catch (_error) {
          result = { error: responseText || "Unexpected response from COD endpoint." };
        }

        if (!submitResponse.ok) {
          status.textContent = result.error || "Submission failed.";
          status.style.color = "#b91c1c";
          return;
        }

        status.textContent = result.message || "COD request submitted.";
        status.style.color = "#047857";
        form.reset();
        syncQuantity(container, currency, numericPrice, displayPrice);
      } catch (_error) {
        status.textContent = "Could not submit COD order. Please try again.";
        status.style.color = "#b91c1c";
      } finally {
        submitButton.disabled = false;
      }
    }

    form.addEventListener("click", function (event) {
      if (event.target.closest(".fast-cod-pro-button")) {
        submitCodOrder(event);
      }
    });

    form.addEventListener("keydown", function (event) {
      if (event.key === "Enter") {
        submitCodOrder(event);
      }
    });

    syncQuantity(container, currency, numericPrice, displayPrice);
    enhanceFields(container, endpoint, accentColor);
  }

  document.querySelectorAll("[data-fast-cod-pro-root]").forEach(function (node) {
    init(node).catch(function (error) {
      console.error("Fast Cod Pro form failed to initialize", error);
    });
  });
})();
