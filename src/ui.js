import { controlSections, presetButtons, presets } from "./config.js";
import { controlAvailability } from "./control-availability.js";

const toolbarActions = [
  ["randomize", "Random", "primary"],
  ["mutate", "Mutate", ""],
  ["exportPng", "PNG", ""],
  ["shareLink", "Share", ""],
];

export function renderApp(root) {
  root.innerHTML = `
    <main class="app-shell" id="studio">
      <section class="stage" aria-label="Planet preview">
        <div class="topbar">
          <div class="brand-block">
            <span class="eyebrow">PIXEL PLANET LAB / WEBGL2</span>
            <h1>Pixel Planet Lab</h1>
            <p id="status" role="status" aria-live="polite">Ready to create a world</p>
          </div>
          <div class="toolbar" aria-label="Quick actions">
            ${toolbarActions.map(([action, label, variant]) => `
              <button type="button" class="${variant ? "button-primary" : ""}" data-action="${action}">${label}</button>
            `).join("")}
          </div>
        </div>

        <div class="canvas-wrap">
          <canvas id="planetCanvas" width="128" height="128" aria-label="Generated pixel planet. Drag to move the light."></canvas>
        </div>
        <div class="preview-meta">
          <span>Drag to move light</span>
          <span id="fps" aria-label="Frame rate">—</span>
        </div>

        <div class="preset-row" role="group" aria-label="Planet presets">
          ${presetButtons.map(([preset, label]) => `
            <button type="button" data-preset="${preset}" aria-pressed="false">${label}</button>
          `).join("")}
        </div>
      </section>

      <aside class="panel" aria-label="Generator controls">
        ${controlSections.map((section) => sectionTemplate(section)).join("")}
      </aside>
    </main>

    <section class="batch-section" aria-label="Planet variations">
      <div class="batch-header">
        <div>
          <h2>Variations</h2>
          <p>Explore multiple seeds. Select one to keep.</p>
        </div>
        <button type="button" data-action="batch">Generate batch</button>
      </div>
      <div class="batch-strip" id="batchStrip">
        <p class="batch-empty">Generate a batch to explore other worlds.</p>
      </div>
    </section>
  `;
}

export function syncUi(state) {
  document.querySelectorAll("[data-key]").forEach((input) => {
    const key = input.dataset.key;
    const value = state[key];
    if (input.type === "checkbox") {
      input.checked = Boolean(value);
    } else {
      input.value = input.dataset.format === "percent"
        ? String(Math.round(Number(value) * 100))
        : String(value);
    }

    const field = input.closest?.("[data-control]");
    if (field) {
      const { enabled, reason } = controlAvailability(key, state);
      input.disabled = !enabled;
      field.classList.toggle("is-disabled", !enabled);
      const hint = enabled ? field.dataset.help || "" : reason;
      field.title = hint;
      if (enabled) input.removeAttribute("aria-description");
      else input.setAttribute("aria-description", reason);
    }
  });

  document.querySelectorAll("[data-value]").forEach((el) => {
    const value = state[el.dataset.value];
    el.textContent = typeof value === "number" && !Number.isInteger(value)
      ? value.toFixed(2)
      : String(value);
  });

  document.querySelectorAll("[data-preset]").forEach((button) => {
    button.setAttribute("aria-pressed", String(presets[button.dataset.preset]?.body === state.body));
  });
}

function sectionTemplate(section) {
  const expanded = section.title === "World" || section.title === "Surface" ? " open" : "";
  return `
    <details class="control-section"${expanded}>
      <summary class="section-head">
        <h2>${section.title}</h2>
        <span class="section-arrow" aria-hidden="true"></span>
      </summary>
      <div class="control-grid">
        ${section.controls.map(controlTemplate).join("")}
      </div>
    </details>
  `;
}

function controlTemplate(control) {
  const hint = escapeAttr(control.help || "");
  if (control.type === "button") {
    return `<button type="button" class="control-button" data-action="${control.action}" title="${hint}">${control.label}</button>`;
  }

  const key = control.key;
  const common = `data-control="${key}" data-help="${hint}" title="${hint}"`;
  if (control.type === "checkbox") {
    return `
      <label class="field field-check" ${common}>
        <span>${control.label}</span>
        <input data-key="${key}" type="checkbox" />
      </label>`;
  }

  if (control.type === "select") {
    return `
      <label class="field" ${common}>
        <span class="field-label">${control.label}</span>
        <select data-key="${key}">
          ${control.options.map(([value, label]) => `<option value="${value}">${label}</option>`).join("")}
        </select>
      </label>`;
  }

  if (control.type === "number") {
    return `
      <label class="field" ${common}>
        <span class="field-label">${control.label}</span>
        <input data-key="${key}" type="number" min="${control.min}" max="${control.max}" step="${control.step}" />
      </label>`;
  }

  if (control.type === "percent") {
    return `
      <label class="field" ${common}>
        <span class="field-label">${control.label}</span>
        <span class="percent-field">
          <input data-key="${key}" data-format="percent" type="number" min="0" max="100" step="1" />
          <span aria-hidden="true">%</span>
        </span>
      </label>`;
  }

  return `
    <label class="field field-range" ${common}>
      <span class="field-label">${control.label}</span>
      <output data-value="${key}"></output>
      <input data-key="${key}" type="range" min="${control.min ?? 0}" max="${control.max ?? 1}" step="${control.step ?? 0.01}" />
    </label>`;
}

function escapeAttr(value) {
  return String(value).replaceAll("&", "&amp;").replaceAll('"', "&quot;").replaceAll("<", "&lt;");
}
