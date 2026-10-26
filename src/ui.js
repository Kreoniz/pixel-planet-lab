import { controlSections, presetButtons, presets } from "./config.js";
import { controlAvailability } from "./control-availability.js";
import { shortcuts, actionShortcuts, presetShortcuts, displayShortcut } from "./hotkeys.js";
import { pixelScaleInfo } from "./editor-state.js";

const toolbarActions = [
  ["randomize", "Random", "primary"],
  ["mutate", "Mutate", ""],
  ["rerollSeed", "Seed ↻", ""],
  ["undo", "↶", ""],
  ["redo", "↷", ""],
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
              <button type="button" class="${variant ? "button-primary" : ""}" data-action="${action}"${shortcutAttrs(action)}>${label}</button>
            `).join("")}
            <button type="button" class="shortcuts-trigger" data-shortcuts-open aria-haspopup="dialog" aria-controls="shortcuts-dialog" title="Keyboard shortcuts (?)" aria-label="Show keyboard shortcuts">?</button>
          </div>
        </div>

        <div class="canvas-wrap">
          <canvas id="planetCanvas" width="128" height="128" aria-label="Generated pixel planet. Drag to move the light."></canvas>
        </div>
        <div class="preview-meta">
          <span class="preview-drag-hint">Drag to move light</span>
          <div class="timeline" role="group" aria-label="Simulation time">
            <button type="button" data-action="stepBack" aria-label="Step backward one frame" title="Previous frame">‹</button>
            <input type="range" data-timeline min="0" max="60" step="0.1" value="0" aria-label="Simulation time in seconds" />
            <button type="button" data-action="stepForward" aria-label="Step forward one frame" title="Next frame">›</button>
            <output data-playhead>0.0s</output>
          </div>
          <span id="fps" aria-label="Frame rate">—</span>
        </div>

        <div class="preset-row" role="group" aria-label="Planet presets">
          ${presetButtons.map(([preset, label]) => `
            <button type="button" data-preset="${preset}" aria-pressed="false" title="${label} preset (${presetShortcuts[preset]})" aria-keyshortcuts="${presetShortcuts[preset]}">${label}</button>
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
        <button type="button" data-action="batch"${shortcutAttrs("batch")}>Generate batch</button>
      </div>
      <div class="batch-strip" id="batchStrip">
        <p class="batch-empty">Generate a batch to explore other worlds.</p>
      </div>
    </section>

    <dialog class="shortcuts-dialog" id="shortcuts-dialog" aria-labelledby="shortcuts-dialog-title" aria-describedby="shortcuts-dialog-description">
      <div class="shortcuts-heading">
        <div>
          <h2 id="shortcuts-dialog-title">Keyboard shortcuts</h2>
          <p id="shortcuts-dialog-description">Shortcuts are disabled while editing an input or select.</p>
        </div>
        <button type="button" class="shortcuts-close" data-shortcuts-close aria-label="Close keyboard shortcuts">Close <kbd>Esc</kbd></button>
      </div>
      <div class="shortcuts-grid">
        <section aria-label="Editor actions">
          <h3>Editor</h3>
          ${shortcutRows("Actions")}
        </section>
        <section aria-label="Planet presets">
          <h3>Presets</h3>
          ${shortcutRows("Presets")}
        </section>
      </div>
    </dialog>
  `;
}

function shortcutRows(group) {
  return shortcuts.filter((shortcut) => shortcut.group === group).map(({ label, hotkey }) =>
    `<div class="shortcut-row"><span>${label}</span><kbd>${displayShortcut(hotkey)}</kbd></div>`
  ).join("");
}

function shortcutAttrs(action) {
  const hotkey = actionShortcuts[action];
  if (!hotkey) return "";
  const aria = hotkey.replace("Mod", "Control");
  const ariaKeys = hotkey.includes("Mod") ? `${aria} ${hotkey.replace("Mod", "Meta")}` : aria;
  return ` title="Shortcut: ${displayShortcut(hotkey)}" aria-keyshortcuts="${ariaKeys}"`;
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
  document.querySelectorAll("[data-grid-preset]").forEach((button) => {
    button.setAttribute("aria-pressed", String(Number(button.dataset.gridPreset) === Number(state.pixelSize)));
  });
  const hint = document.querySelector?.("[data-pixel-scale]");
  if (hint) {
    const scale = pixelScaleInfo(Number(state.pixelSize), Number(state.size));
    hint.textContent = scale.text;
    hint.dataset.tone = scale.tone;
  }
}

export function syncEditorUi(preferences, { canUndo = false, canRedo = false } = {}) {
  const fps = document.querySelector?.('[data-preference="previewFps"]');
  if (fps) fps.value = String(preferences.previewFps);
  const fpsLabel = document.querySelector?.("[data-fps-target]");
  if (fpsLabel) fpsLabel.textContent = `${preferences.previewFps} FPS`;
  document.querySelectorAll("[data-lock-preference]").forEach((input) => {
    input.checked = Boolean(preferences[input.dataset.lockPreference]);
  });
  const undo = document.querySelector?.('[data-action="undo"]');
  const redo = document.querySelector?.('[data-action="redo"]');
  if (undo) undo.disabled = !canUndo;
  if (redo) redo.disabled = !canRedo;
}

export function syncTimelineUi(seconds, isPlaying) {
  const scrub = document.querySelector?.("[data-timeline]");
  if (scrub && document.activeElement !== scrub)
    scrub.value = String(seconds % 60);
  const label = document.querySelector?.("[data-playhead]");
  if (label) label.textContent = `${seconds.toFixed(1)}s`;
  if (scrub) scrub.setAttribute("aria-valuetext", `${seconds.toFixed(1)} seconds, ${isPlaying ? "playing" : "paused"}`);
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
        ${section.title === "World" ? `<label class="field field-range control-wide" title="Target animation frame rate, not a guarantee of GPU performance">
          <span class="field-label">Preview FPS target</span>
          <output data-fps-target>30 FPS</output>
          <input data-preference="previewFps" type="range" min="5" max="60" step="5" />
        </label>` : ""}
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
    const lockKey = key === "body" ? "lockType" : key === "palette" ? "lockPalette" : null;
    const lock = lockKey ? `<label class="lock-option" title="Keep this setting when choosing Random">
      <input type="checkbox" data-lock-preference="${lockKey}" /> Lock
    </label>` : "";
    const quick = key === "pixelSize"
      ? `<div class="grid-quick" role="group" aria-label="Pixel detail presets">
          <button type="button" data-grid-preset="64">Chunky</button>
          <button type="button" data-grid-preset="128">Balanced</button>
          <button type="button" data-grid-preset="256">Fine</button>
         </div><small data-pixel-scale aria-live="polite"></small>`
      : "";
    return `
      <div class="field ${key === "pixelSize" ? "control-wide" : ""}" ${common}>
        <label class="field-label" for="field-${key}">${control.label}</label>
        <div class="select-row">
          <select id="field-${key}" data-key="${key}">
            ${control.options.map(([value, label]) => `<option value="${value}">${label}</option>`).join("")}
          </select>
          ${lock}
        </div>
        ${quick}
      </div>`;
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
