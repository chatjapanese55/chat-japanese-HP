/**
 * Chat Japanese — Apply Page Script
 * Handles: accordion UI, option selection, form validation,
 *          GAS submission (3-strategy fallback), thank-you page
 *
 * GAS URL: set GAS_URL below after deploying your Google Apps Script.
 */

"use strict";

// ─────────────────────────────────────────────────────────────────────────────
// CONFIG — Replace with your deployed GAS Web App URL
// ─────────────────────────────────────────────────────────────────────────────
const GAS_URL = ""; // e.g. "https://script.google.com/macros/s/AKfycb.../exec"

// ─────────────────────────────────────────────────────────────────────────────
// STATE
// ─────────────────────────────────────────────────────────────────────────────
const state = {
  course:   null,
  location: null,
  duration: null,
};

// ─────────────────────────────────────────────────────────────────────────────
// ACCORDION
// ─────────────────────────────────────────────────────────────────────────────
document.querySelectorAll(".acc-header").forEach((btn) => {
  btn.addEventListener("click", () => {
    const targetId = btn.getAttribute("data-target");
    const panel    = document.getElementById(targetId);
    const isOpen   = btn.getAttribute("aria-expanded") === "true";

    if (isOpen) {
      closePanel(btn, panel);
    } else {
      openPanel(btn, panel);
    }
  });
});

function openPanel(btn, panel) {
  btn.setAttribute("aria-expanded", "true");
  panel.classList.remove("closed");
}

function closePanel(btn, panel) {
  btn.setAttribute("aria-expanded", "false");
  panel.classList.add("closed");
}

function openNextAccordion(currentGroup) {
  const order = ["course", "location", "duration"];
  const idx   = order.indexOf(currentGroup);
  if (idx !== -1 && idx < order.length - 1) {
    const next      = order[idx + 1];
    const nextBtn   = document.querySelector(`[data-target="panel-${next}"]`);
    const nextPanel = document.getElementById(`panel-${next}`);
    if (nextBtn && nextPanel) openPanel(nextBtn, nextPanel);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// OPTION SELECTION (cards & chips)
// ─────────────────────────────────────────────────────────────────────────────
document.querySelectorAll(".option-card, .option-chip").forEach((btn) => {
  btn.addEventListener("click", () => {
    const group = btn.getAttribute("data-group");
    const value = btn.getAttribute("data-value");

    // Deselect siblings
    document.querySelectorAll(`[data-group="${group}"]`).forEach((el) => {
      el.classList.remove("selected");
    });

    // Select this one
    btn.classList.add("selected");
    state[group] = value;

    // Update icon to "complete"
    const icon = document.getElementById(`icon-${group}`);
    if (icon) {
      icon.classList.add("complete");
      icon.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>`;
    }

    // Update summary text
    const summary = document.getElementById(`summary-${group}`);
    if (summary) summary.textContent = value;

    // Hide error
    const err = document.getElementById(`err-${group}`);
    if (err) err.classList.add("hidden");

    // Auto-advance to next accordion
    openNextAccordion(group);

    // Update selection summary pill in form card
    updateSelectionSummary();

    // Special rule: "Chat Shinjuku Friday Tour" forces Tokyo
    if (group === "course" && value === "Chat Shinjuku Friday Tour") {
      const tokyoBtn = document.querySelector('[data-group="location"][data-value="Tokyo"]');
      if (tokyoBtn) tokyoBtn.click();
    }
  });
});

function updateSelectionSummary() {
  const parts = [
    state.course,
    state.location,
    state.duration,
    document.getElementById("startDate").value || null,
  ].filter(Boolean);

  const pill = document.getElementById("selectionSummary");
  const text = document.getElementById("summaryText");

  if (parts.length > 0) {
    text.textContent = parts.join(" · ");
    pill.classList.remove("hidden");
  } else {
    pill.classList.add("hidden");
  }
}

// Also update summary when date changes
document.getElementById("startDate").addEventListener("change", updateSelectionSummary);

// ─────────────────────────────────────────────────────────────────────────────
// FORM VALIDATION
// ─────────────────────────────────────────────────────────────────────────────
function showError(id, msg) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = (el.textContent.startsWith("⚠") ? "" : "") + msg;
  el.classList.remove("hidden");
}

function clearError(id) {
  const el = document.getElementById(id);
  if (el) el.classList.add("hidden");
}

function markInput(id, hasError) {
  const el = document.getElementById(id);
  if (!el) return;
  if (hasError) el.classList.add("error");
  else          el.classList.remove("error");
}

// Live validation on blur
["firstName", "lastName", "email", "emailConfirm", "startDate"].forEach((id) => {
  const el = document.getElementById(id);
  if (!el) return;
  el.addEventListener("blur", () => validateField(id));
  el.addEventListener("input", () => {
    clearError(`err-${id}`);
    markInput(id, false);
  });
});

function validateField(id) {
  const el    = document.getElementById(id);
  const value = el ? el.value.trim() : "";

  if (id === "firstName") {
    if (!value) { showError("err-firstName", "First name is required."); markInput(id, true); return false; }
  }
  if (id === "lastName") {
    if (!value) { showError("err-lastName", "Last name is required."); markInput(id, true); return false; }
  }
  if (id === "email") {
    if (!value) { showError("err-email", "Email is required."); markInput(id, true); return false; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) { showError("err-email", "Please enter a valid email address."); markInput(id, true); return false; }
  }
  if (id === "emailConfirm") {
    const emailVal = document.getElementById("email").value.trim();
    if (!value) { showError("err-emailConfirm", "Please confirm your email."); markInput(id, true); return false; }
    if (value !== emailVal) { showError("err-emailConfirm", "Email addresses do not match."); markInput(id, true); return false; }
  }
  if (id === "startDate") {
    if (!value) { showError("err-date", "Please select a start date."); markInput(id, true); return false; }
  }
  clearError(`err-${id}`);
  markInput(id, false);
  return true;
}

function validateAll() {
  let ok = true;

  if (!state.course)   { showError("err-course",   "Please select a course.");   ok = false; }
  if (!state.location) { showError("err-location",  "Please select a location."); ok = false; }
  if (!state.duration) { showError("err-duration",  "Please select a duration."); ok = false; }

  ["firstName", "lastName", "email", "emailConfirm", "startDate"].forEach((id) => {
    if (!validateField(id)) ok = false;
  });

  return ok;
}

// ─────────────────────────────────────────────────────────────────────────────
// GAS SUBMISSION — 3-strategy fallback
// ─────────────────────────────────────────────────────────────────────────────

function buildQueryString(data) {
  return Object.entries(data)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join("&");
}

function sleep(ms) {
  return new Promise((res) => setTimeout(res, ms));
}

/** Strategy 1: GET fetch no-cors (primary) */
async function submitViaGet(data, url) {
  const res = await fetch(`${url}?${buildQueryString(data)}`, {
    method: "GET",
    mode:   "no-cors",
    cache:  "no-cache",
  });
  // no-cors → opaque response; any non-network-error = success
  if (res.type !== "opaque" && !res.ok) throw new Error(`HTTP ${res.status}`);
}

/** Strategy 2: POST fetch no-cors */
async function submitViaPost(data, url) {
  await fetch(url, {
    method:  "POST",
    mode:    "no-cors",
    cache:   "no-cache",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body:    buildQueryString(data),
  });
}

/** Strategy 3: Image ping (works even when fetch is blocked) */
function submitViaImagePing(data, url) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload  = resolve;
    img.onerror = resolve; // GAS returns HTML → triggers onerror, but request was sent
    img.src     = `${url}?${buildQueryString(data)}&_t=${Date.now()}`;
    setTimeout(resolve, 6000);
  });
}

/** Save to localStorage as persistent backup */
function saveLocally(data) {
  try {
    const queue = JSON.parse(localStorage.getItem("cj_apply_queue") || "[]");
    queue.push({ ...data, _savedAt: new Date().toISOString() });
    if (queue.length > 50) queue.splice(0, queue.length - 50);
    localStorage.setItem("cj_apply_queue", JSON.stringify(queue));
  } catch (_) { /* ignore */ }
}

async function submitToGAS(data) {
  saveLocally(data); // always save locally first

  if (!GAS_URL) {
    console.warn("[GAS] GAS_URL is not set. Data saved to localStorage only.");
    return { success: true, method: "local-only" };
  }

  const delays = [800, 1600, 3200];

  // Strategy 1: GET with retries
  for (let i = 0; i < delays.length; i++) {
    try {
      await submitViaGet(data, GAS_URL);
      console.log(`[GAS] ✓ GET fetch (attempt ${i + 1})`);
      return { success: true, method: "fetch-get" };
    } catch (e) {
      console.warn(`[GAS] GET attempt ${i + 1} failed:`, e);
      if (i < delays.length - 1) await sleep(delays[i]);
    }
  }

  // Strategy 2: POST
  try {
    await submitViaPost(data, GAS_URL);
    console.log("[GAS] ✓ POST fetch");
    return { success: true, method: "fetch-post" };
  } catch (e) {
    console.warn("[GAS] POST failed:", e);
  }

  // Strategy 3: Image ping
  try {
    await submitViaImagePing(data, GAS_URL);
    console.log("[GAS] ✓ Image ping");
    return { success: true, method: "image-ping" };
  } catch (e) {
    console.warn("[GAS] Image ping failed:", e);
  }

  console.error("[GAS] ✗ All strategies failed. Data in localStorage.");
  return { success: false, method: "failed" };
}

// ─────────────────────────────────────────────────────────────────────────────
// FORM SUBMIT
// ─────────────────────────────────────────────────────────────────────────────
document.getElementById("applyForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const formError = document.getElementById("formError");
  formError.classList.add("hidden");

  if (!validateAll()) {
    formError.classList.remove("hidden");
    // Scroll to first error
    const firstErr = document.querySelector(".field-error:not(.hidden), .acc-panel .field-error:not(.hidden)");
    if (firstErr) firstErr.scrollIntoView({ behavior: "smooth", block: "center" });
    return;
  }

  // Disable button & show spinner
  const btn     = document.getElementById("submitBtn");
  const label   = document.getElementById("submitLabel");
  const spinner = document.getElementById("submitSpinner");
  btn.disabled  = true;
  label.textContent = "Sending...";
  spinner.classList.remove("hidden");

  const formData = {
    course:      state.course,
    location:    state.location,
    duration:    state.duration,
    startDate:   document.getElementById("startDate").value,
    firstName:   document.getElementById("firstName").value.trim(),
    lastName:    document.getElementById("lastName").value.trim(),
    email:       document.getElementById("email").value.trim().toLowerCase(),
    submittedAt: new Date().toISOString(),
  };

  const result = await submitToGAS(formData);

  btn.disabled = false;
  label.textContent = "Apply Now →";
  spinner.classList.add("hidden");

  if (result.success) {
    showThanksPage(formData);
  } else {
    formError.textContent = "Submission failed. Please try again or contact us directly.";
    formError.classList.remove("hidden");
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// THANK YOU PAGE
// ─────────────────────────────────────────────────────────────────────────────
function showThanksPage(data) {
  // Heading
  document.getElementById("thanksHeading").textContent =
    data.firstName ? `Thank you, ${data.firstName}!` : "Thank you!";

  // Email pill
  document.getElementById("thanksEmail").textContent = data.email;

  // Application summary
  const rows = [
    ["Course",      data.course],
    ["Location",    data.location],
    ["Duration",    data.duration],
    ["Start Date",  formatDate(data.startDate)],
    ["Name",        `${data.firstName} ${data.lastName}`],
  ];
  const summaryEl = document.getElementById("thanksSummary");
  summaryEl.innerHTML =
    `<strong>Application Summary</strong>` +
    rows
      .filter(([, v]) => v)
      .map(([k, v]) => `<span style="display:flex;justify-content:space-between;gap:12px;"><span style="color:var(--ink-muted)">${k}</span><span style="font-weight:700">${v}</span></span>`)
      .join("");

  // Show overlay
  document.getElementById("thanksPage").classList.remove("hidden");
  document.body.style.overflow = "hidden";
}

function formatDate(iso) {
  if (!iso) return "";
  try {
    return new Date(iso + "T00:00:00").toLocaleDateString("en-US", {
      year: "numeric", month: "long", day: "numeric",
    });
  } catch (_) { return iso; }
}

// Back button
document.getElementById("backBtn").addEventListener("click", () => {
  document.getElementById("thanksPage").classList.add("hidden");
  document.body.style.overflow = "";
  // Reset form
  document.getElementById("applyForm").reset();
  Object.keys(state).forEach((k) => (state[k] = null));
  document.querySelectorAll(".option-card, .option-chip").forEach((el) => el.classList.remove("selected"));
  document.querySelectorAll(".acc-icon-wrap").forEach((el) => {
    el.classList.remove("complete");
  });
  // Restore original icons
  const icons = {
    course:   `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>`,
    location: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>`,
    duration: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`,
  };
  Object.entries(icons).forEach(([key, svg]) => {
    const el = document.getElementById(`icon-${key}`);
    if (el) el.innerHTML = svg;
  });
  document.querySelectorAll(".acc-summary").forEach((el) => (el.textContent = ""));
  document.getElementById("selectionSummary").classList.add("hidden");
  // Re-open first accordion
  const firstBtn   = document.querySelector('[data-target="panel-course"]');
  const firstPanel = document.getElementById("panel-course");
  if (firstBtn && firstPanel) openPanel(firstBtn, firstPanel);
  ["panel-location", "panel-duration"].forEach((id) => {
    const p = document.getElementById(id);
    const b = document.querySelector(`[data-target="${id}"]`);
    if (p && b) closePanel(b, p);
  });
});
