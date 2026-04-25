/**
 * Chat Japanese — Apply Page Script
 *
 * Features:
 *  - Accordion open/close with auto-advance
 *  - Course-based rules:
 *      1-Week / Intensive  → Monday starts only
 *      Weekend Course      → Saturday starts only, Duration hidden
 *      Friday Tour         → Friday starts only, Duration hidden, Location = Tokyo
 *  - Form validation
 *  - GAS submission (3-strategy fallback + localStorage backup)
 *  - Thank-you overlay
 *
 * GAS URL: set GAS_URL below after deploying your Google Apps Script.
 */

"use strict";

// ─────────────────────────────────────────────────────────────────────────────
// CONFIG
// ─────────────────────────────────────────────────────────────────────────────
const GAS_URL = ""; // e.g. "https://script.google.com/macros/s/AKfycb.../exec"

// ─────────────────────────────────────────────────────────────────────────────
// COURSE RULES
// ─────────────────────────────────────────────────────────────────────────────
// dayOfWeek: 0=Sun,1=Mon,2=Tue,3=Wed,4=Thu,5=Fri,6=Sat
const COURSE_RULES = {
  "1-Week Course":              { allowedDay: 1, dayLabel: "Monday",   showDuration: true  },
  "Intensive Course":           { allowedDay: 1, dayLabel: "Monday",   showDuration: true  },
  "Weekend Course":             { allowedDay: 6, dayLabel: "Saturday", showDuration: false },
  "Chat Shinjuku Friday Tour":  { allowedDay: 5, dayLabel: "Friday",   showDuration: false },
};

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
    isOpen ? closePanel(btn, panel) : openPanel(btn, panel);
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

/** Auto-open the next accordion in the sequence */
function openNextAccordion(currentGroup) {
  // Build the visible order dynamically (skip hidden Duration)
  const durationHidden = document.getElementById("acc-duration").classList.contains("hidden");
  const order = ["course", "location"];
  if (!durationHidden) order.push("duration");

  const idx = order.indexOf(currentGroup);
  if (idx !== -1 && idx < order.length - 1) {
    const next      = order[idx + 1];
    const nextBtn   = document.querySelector(`[data-target="panel-${next}"]`);
    const nextPanel = document.getElementById(`panel-${next}`);
    if (nextBtn && nextPanel) openPanel(nextBtn, nextPanel);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// OPTION SELECTION
// ─────────────────────────────────────────────────────────────────────────────
document.querySelectorAll(".option-card, .option-chip").forEach((btn) => {
  btn.addEventListener("click", () => {
    const group = btn.getAttribute("data-group");
    const value = btn.getAttribute("data-value");

    // Deselect siblings
    document.querySelectorAll(`[data-group="${group}"]`).forEach((el) => {
      el.classList.remove("selected");
    });

    // Select this
    btn.classList.add("selected");
    state[group] = value;

    // Mark icon complete
    markIconComplete(group);

    // Update summary
    const summary = document.getElementById(`summary-${group}`);
    if (summary) summary.textContent = value;

    // Clear error
    clearError(`err-${group}`);

    // Course-specific logic
    if (group === "course") {
      applyCourseRules(value);
    }

    // Auto-advance
    openNextAccordion(group);

    // Update form card summary
    updateSelectionSummary();
  });
});

/** Apply rules based on selected course */
function applyCourseRules(course) {
  const rule = COURSE_RULES[course];
  if (!rule) return;

  // Duration accordion visibility
  const durationAcc = document.getElementById("acc-duration");
  if (rule.showDuration) {
    durationAcc.classList.remove("hidden");
  } else {
    durationAcc.classList.add("hidden");
    // Clear duration state
    state.duration = null;
    document.querySelectorAll('[data-group="duration"]').forEach((el) => el.classList.remove("selected"));
    const dSummary = document.getElementById("summary-duration");
    if (dSummary) dSummary.textContent = "";
    const dIcon = document.getElementById("icon-duration");
    if (dIcon) {
      dIcon.classList.remove("complete");
      dIcon.innerHTML = SVG_ICONS.duration;
    }
  }

  // Force Tokyo for Friday Tour
  if (course === "Chat Shinjuku Friday Tour") {
    const tokyoBtn = document.querySelector('[data-group="location"][data-value="Tokyo"]');
    if (tokyoBtn && !tokyoBtn.classList.contains("selected")) {
      tokyoBtn.click();
    }
  }

  // Update date hint
  const hint = document.getElementById("dateHint");
  if (hint) {
    hint.textContent = `Please select a ${rule.dayLabel} as your start date.`;
  }

  // Clear existing date selection
  const dateInput = document.getElementById("startDate");
  if (dateInput) {
    dateInput.value = "";
    clearError("err-date");
    dateInput.classList.remove("error");
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// DATE VALIDATION — weekday filter
// ─────────────────────────────────────────────────────────────────────────────
document.getElementById("startDate").addEventListener("change", function () {
  clearError("err-date");
  this.classList.remove("error");

  if (!this.value) return;

  const rule = state.course ? COURSE_RULES[state.course] : null;
  if (!rule) return;

  // Parse date without timezone shift
  const [y, m, d] = this.value.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  const dow  = date.getDay(); // 0=Sun … 6=Sat

  if (dow !== rule.allowedDay) {
    showError("err-date", `Please select a ${rule.dayLabel} as your start date.`);
    this.classList.add("error");
    this.value = "";
  }

  updateSelectionSummary();
});

// ─────────────────────────────────────────────────────────────────────────────
// SELECTION SUMMARY (form card pill)
// ─────────────────────────────────────────────────────────────────────────────
function updateSelectionSummary() {
  const durationHidden = document.getElementById("acc-duration").classList.contains("hidden");
  const parts = [
    state.course,
    state.location,
    durationHidden ? null : state.duration,
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

// ─────────────────────────────────────────────────────────────────────────────
// ICON HELPERS
// ─────────────────────────────────────────────────────────────────────────────
const SVG_ICONS = {
  course:   `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>`,
  location: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>`,
  duration: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`,
};
const CHECK_SVG = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>`;

function markIconComplete(group) {
  const icon = document.getElementById(`icon-${group}`);
  if (!icon) return;
  icon.classList.add("complete");
  icon.innerHTML = CHECK_SVG;
}

function resetIcon(group) {
  const icon = document.getElementById(`icon-${group}`);
  if (!icon) return;
  icon.classList.remove("complete");
  icon.innerHTML = SVG_ICONS[group] || "";
}

// ─────────────────────────────────────────────────────────────────────────────
// FORM VALIDATION
// ─────────────────────────────────────────────────────────────────────────────
function showError(id, msg) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = msg;
  el.classList.remove("hidden");
}

function clearError(id) {
  const el = document.getElementById(id);
  if (el) el.classList.add("hidden");
}

function markInput(id, hasError) {
  const el = document.getElementById(id);
  if (!el) return;
  hasError ? el.classList.add("error") : el.classList.remove("error");
}

["firstName", "lastName", "email", "emailConfirm"].forEach((id) => {
  const el = document.getElementById(id);
  if (!el) return;
  el.addEventListener("blur",  () => validateField(id));
  el.addEventListener("input", () => { clearError(`err-${id}`); markInput(id, false); });
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
  clearError(`err-${id}`);
  markInput(id, false);
  return true;
}

function validateAll() {
  let ok = true;
  const durationHidden = document.getElementById("acc-duration").classList.contains("hidden");

  if (!state.course)   { showError("err-course",   "Please select a course.");   ok = false; }
  if (!state.location) { showError("err-location",  "Please select a location."); ok = false; }
  if (!durationHidden && !state.duration) { showError("err-duration", "Please select a duration."); ok = false; }

  // Date
  const dateVal = document.getElementById("startDate").value;
  if (!dateVal) {
    showError("err-date", "Please select a start date.");
    document.getElementById("startDate").classList.add("error");
    ok = false;
  } else {
    // Re-check weekday
    const rule = state.course ? COURSE_RULES[state.course] : null;
    if (rule) {
      const [y, m, d] = dateVal.split("-").map(Number);
      const dow = new Date(y, m - 1, d).getDay();
      if (dow !== rule.allowedDay) {
        showError("err-date", `Please select a ${rule.dayLabel} as your start date.`);
        document.getElementById("startDate").classList.add("error");
        ok = false;
      }
    }
  }

  ["firstName", "lastName", "email", "emailConfirm"].forEach((id) => {
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

function sleep(ms) { return new Promise((res) => setTimeout(res, ms)); }

async function submitViaGet(data, url) {
  const res = await fetch(`${url}?${buildQueryString(data)}`, {
    method: "GET", mode: "no-cors", cache: "no-cache",
  });
  if (res.type !== "opaque" && !res.ok) throw new Error(`HTTP ${res.status}`);
}

async function submitViaPost(data, url) {
  await fetch(url, {
    method: "POST", mode: "no-cors", cache: "no-cache",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: buildQueryString(data),
  });
}

function submitViaImagePing(data, url) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload  = resolve;
    img.onerror = resolve;
    img.src = `${url}?${buildQueryString(data)}&_t=${Date.now()}`;
    setTimeout(resolve, 6000);
  });
}

function saveLocally(data) {
  try {
    const queue = JSON.parse(localStorage.getItem("cj_apply_queue") || "[]");
    queue.push({ ...data, _savedAt: new Date().toISOString() });
    if (queue.length > 50) queue.splice(0, queue.length - 50);
    localStorage.setItem("cj_apply_queue", JSON.stringify(queue));
  } catch (_) { /* ignore */ }
}

async function submitToGAS(data) {
  saveLocally(data);

  if (!GAS_URL) {
    console.warn("[GAS] GAS_URL not set. Data saved locally only.");
    return { success: true, method: "local-only" };
  }

  const delays = [800, 1600, 3200];

  // Strategy 1: GET with retries
  for (let i = 0; i < delays.length; i++) {
    try {
      await submitViaGet(data, GAS_URL);
      console.log(`[GAS] ✓ GET (attempt ${i + 1})`);
      return { success: true, method: "fetch-get" };
    } catch (e) {
      console.warn(`[GAS] GET attempt ${i + 1} failed:`, e);
      if (i < delays.length - 1) await sleep(delays[i]);
    }
  }

  // Strategy 2: POST
  try {
    await submitViaPost(data, GAS_URL);
    console.log("[GAS] ✓ POST");
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
    const firstErr = document.querySelector(".field-error:not(.hidden)");
    if (firstErr) firstErr.scrollIntoView({ behavior: "smooth", block: "center" });
    return;
  }

  const btn     = document.getElementById("submitBtn");
  const label   = document.getElementById("submitLabel");
  const spinner = document.getElementById("submitSpinner");
  btn.disabled  = true;
  label.textContent = "Sending...";
  spinner.classList.remove("hidden");

  const durationHidden = document.getElementById("acc-duration").classList.contains("hidden");

  const formData = {
    course:      state.course,
    location:    state.location,
    duration:    durationHidden ? "N/A" : (state.duration || ""),
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
  document.getElementById("thanksHeading").textContent =
    data.firstName ? `Thank you, ${data.firstName}!` : "Thank you!";

  document.getElementById("thanksEmail").textContent = data.email;

  const rows = [
    ["Course",      data.course],
    ["Location",    data.location],
    ["Duration",    data.duration === "N/A" ? null : data.duration],
    ["Start Date",  formatDate(data.startDate)],
    ["Name",        `${data.firstName} ${data.lastName}`],
  ].filter(([, v]) => v);

  document.getElementById("thanksSummary").innerHTML =
    `<strong>Application Summary</strong>` +
    rows.map(([k, v]) =>
      `<span style="display:flex;justify-content:space-between;gap:12px;">` +
      `<span style="color:var(--ink-light)">${k}</span>` +
      `<span style="font-weight:700">${v}</span></span>`
    ).join("");

  document.getElementById("thanksPage").classList.remove("hidden");
  document.body.style.overflow = "hidden";
}

function formatDate(iso) {
  if (!iso) return "";
  try {
    const [y, m, d] = iso.split("-").map(Number);
    return new Date(y, m - 1, d).toLocaleDateString("en-US", {
      year: "numeric", month: "long", day: "numeric",
    });
  } catch (_) { return iso; }
}

// ─────────────────────────────────────────────────────────────────────────────
// BACK BUTTON — full reset
// ─────────────────────────────────────────────────────────────────────────────
document.getElementById("backBtn").addEventListener("click", () => {
  document.getElementById("thanksPage").classList.add("hidden");
  document.body.style.overflow = "";

  // Reset form inputs
  document.getElementById("applyForm").reset();

  // Reset state
  Object.keys(state).forEach((k) => (state[k] = null));

  // Deselect all options
  document.querySelectorAll(".option-card, .option-chip").forEach((el) => el.classList.remove("selected"));

  // Reset icons
  ["course", "location", "duration"].forEach(resetIcon);

  // Clear summaries
  document.querySelectorAll(".acc-summary").forEach((el) => (el.textContent = ""));

  // Hide selection pill
  document.getElementById("selectionSummary").classList.add("hidden");

  // Clear date hint
  const hint = document.getElementById("dateHint");
  if (hint) hint.textContent = "";

  // Show Duration accordion (reset to visible)
  document.getElementById("acc-duration").classList.remove("hidden");

  // Reopen first accordion, close others
  const courseBtn   = document.querySelector('[data-target="panel-course"]');
  const coursePanel = document.getElementById("panel-course");
  if (courseBtn && coursePanel) openPanel(courseBtn, coursePanel);

  ["panel-location", "panel-duration"].forEach((id) => {
    const p = document.getElementById(id);
    const b = document.querySelector(`[data-target="${id}"]`);
    if (p && b) closePanel(b, p);
  });
});
