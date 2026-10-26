import { actions, controlSections, presetButtons } from "./config.js";

export function renderApp(root) {
  root.innerHTML = `
    <main class="app-shell">
      <section class="stage" aria-label="Planet preview">
        <div class="topbar">
          <div class="brand-block">
            <span class="eyebrow">Shader planet forge</span>
            <h1>Pixel Planet Lab</h1>
            <p id="status">WebGL renderer ready</p>
          </div>
          <div class="toolbar" aria-label="Actions">
            ${actions.map(([action, label]) => `<button type="button" data-action="${action}">${label}</button>`).join("")}
          </div>
        </div>

        <div class="canvas-wrap">
          <canvas id="planetCanvas" width="192" height="192" aria-label="Generated pixel planet"></canvas>
        </div>

        <div class="preset-row" aria-label="Presets">
          ${presetButtons.map(([preset, label]) => `<button type="button" data-preset="${preset}">${label}</button>`).join("")}
        </div>
      </section>

      <aside class="panel" aria-label="Generator controls">
        ${controlSections.map(sectionTemplate).join("")}
      </aside>
    </main>

    <section class="batch-strip" id="batchStrip" aria-label="Generated batch"></section>
  `;
}

export function syncUi(state) {
  document.querySelectorAll("[data-key]").forEach((input) => {
    const value = state[input.dataset.key];
    if (input.type === "checkbox") input.checked = Boolean(value);
    else input.value = value;

    if (input.type === "range") {
      const min = Number(input.min || 0);
      const max = Number(input.max || 1);
      const percent = ((Number(value) - min) / (max - min)) * 100;
      input.style.setProperty("--value", `${Math.min(100, Math.max(0, percent))}%`);
    }
  });

  document.querySelectorAll("[data-value]").forEach((el) => {
    const value = state[el.dataset.value];
    el.textContent = typeof value === "number" && !Number.isInteger(value) ? value.toFixed(2) : String(value);
  });
}

function sectionTemplate(section) {
  return `
    <section class="control-section">
      <div class="section-head">
        <h2>${section.title}</h2>
        ${section.meta || ""}
      </div>
      <div class="control-grid">
        ${section.controls.map(controlTemplate).join("")}
      </div>
    </section>
  `;
}

function controlTemplate(control) {
  const title = control.help ? ` title="${escapeAttr(control.help)}"` : "";

  if (control.type === "button") {
    return `<button type="button" class="wide control-wide" data-action="${control.action}"${title}>${control.label}</button>`;
  }

  const spanClass = control.span === "half" ? "" : "control-wide";
  if (control.type === "checkbox") {
    return `
      <label class="check ${spanClass}"${title}>
        <input data-key="${control.key}" type="checkbox" />
        <span>${control.label}</span>
      </label>
    `;
  }

  if (control.type === "select") {
    return `
      <label class="${spanClass}"${title}>
        <span>${control.label}</span>
        <select data-key="${control.key}">
          ${control.options.map(([value, label]) => `<option value="${value}">${label}</option>`).join("")}
        </select>
      </label>
    `;
  }

  if (control.type === "number") {
    return `
      <label class="${spanClass}"${title}>
        <span>${control.label}</span>
        <input data-key="${control.key}" type="number" min="${control.min}" max="${control.max}" step="${control.step}" />
      </label>
    `;
  }

  return `
    <label class="range ${spanClass}"${title}>
      <span>${control.label}</span>
      <span data-value="${control.key}"></span>
      <input data-key="${control.key}" type="range" min="${control.min ?? 0}" max="${control.max ?? 1}" step="${control.step ?? 0.01}" />
    </label>
  `;
}

function escapeAttr(value) {
  return String(value).replaceAll("&", "&amp;").replaceAll('"', "&quot;").replaceAll("<", "&lt;");
}
