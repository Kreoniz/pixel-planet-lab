import { controlSections, presetButtons, palettes } from "./config.js";
import { controlAvailability } from "./control-availability.js";
import { shortcuts, actionShortcuts, presetShortcuts, displayShortcut } from "./hotkeys.js";
import { pixelScaleInfo } from "./editor-state.js";
import { exportPresets } from "./export-options.js";
import { animationSummary } from "./animation-settings.js";

const toolbarActions = [
  ["randomize", "Random", "primary"],
  ["mutate", "Mutate", ""],
  ["rerollSeed", "Seed ↻", ""],
  ["undo", "↶", ""],
  ["redo", "↷", ""],
  ["exportPng", "Save PNG", ""],
  ["shareLink", "Share", ""],
];

export function renderApp(root) {
  root.innerHTML = `
    <main class="app-shell" id="studio">
      <section class="stage" aria-label="Planet preview">
        <div class="topbar">
          <div class="brand-block">
            <span class="eyebrow">CREATE • CUSTOMIZE • EXPORT</span>
            <h1 tabindex="-1">Pixel Planet Lab</h1>
            <p id="status" role="status" aria-live="polite">Ready to create a world</p>
          </div>
          <div class="toolbar" aria-label="Quick actions">
            ${toolbarActions.map(([action, label, variant]) => `
              <button type="button" class="${variant ? "button-primary" : ""}" data-action="${action}"${shortcutAttrs(action)}>${label}</button>
              ${action === "rerollSeed" ? `<button type="button" class="shortcuts-trigger" data-shortcuts-open aria-haspopup="dialog" aria-controls="shortcuts-dialog" title="Keyboard shortcuts (?)" aria-label="Show keyboard shortcuts">?</button>` : ""}
            `).join("")}
          </div>
        </div>

        <div class="canvas-wrap">
          <canvas id="planetCanvas" width="128" height="128" aria-label="Generated pixel planet. Enable Move light to adjust lighting by dragging."></canvas>
        </div>
        <div class="preview-meta">
          <label class="preview-drag-hint"><input type="checkbox" data-light-edit /> Move light</label>
          <div class="timeline" role="group" aria-label="Simulation time">
            <button type="button" data-action="toggleAnimation" data-playback-toggle aria-label="Pause animation">Pause</button>
            <button type="button" data-action="stepBack" aria-label="Step backward one frame" title="Previous frame">‹</button>
            <input type="range" data-timeline min="0" max="60" step="any" value="0" aria-label="Simulation time in seconds" />
            <button type="button" data-action="stepForward" aria-label="Step forward one frame" title="Next frame">›</button>
            <output data-playhead>0.0s</output>
          </div>
          <span id="fps" aria-label="Frame rate">—</span>
        </div>

        <div class="preset-row" role="group" aria-label="Planet presets">
          ${presetButtons.map(([preset, label]) => `
            <button type="button" data-preset="${preset}" title="${label} preset (${presetShortcuts[preset]})" aria-keyshortcuts="${presetShortcuts[preset]}">${label}</button>
          `).join("")}
        </div>
      </section>

      <aside class="panel" aria-label="Generator controls" id="controls">
        <div class="panel-heading"><div><span class="eyebrow">EDITOR</span><h2>World settings</h2></div><label class="pin-preview-option"><input type="checkbox" data-preference="pinPreview" /> Pin preview</label><a class="preview-link" href="#studio">↑ Preview</a></div>
        <div class="compact-preview" data-mini-preview hidden><canvas id="miniPlanetCanvas" width="96" height="96" aria-label="Live planet preview while editing"></canvas><div><strong>Live preview</strong><p>Your changes appear here.</p><div class="compact-actions"><a class="preview-link" href="#studio">View full planet ↑</a><button type="button" data-unpin-preview>Unpin</button></div></div></div>
        <div class="section-links" aria-label="Settings sections">${controlSections.map((section) => `<a href="#section-${section.title.toLowerCase()}" data-section-link>${section.title}</a>`).join("")}</div>
        ${controlSections.map((section) => sectionTemplate(section)).join("")}
      </aside>
    </main>

    <section class="batch-section" aria-label="Planet variations">
      <div class="batch-header">
        <div>
          <h2>Variations</h2>
          <p>Explore nearby ideas or discover a different kind of world. Select one to keep.</p>
        </div>
        <div class="batch-tools"><label class="field">Explore<select data-preference="variationMode"><option value="similar">Similar worlds</option><option value="explore">All planet types</option></select></label>${controlTemplate(controlSections.flatMap((section) => section.controls).find((control) => control.key === "batch"))}<button type="button" data-action="batch"${shortcutAttrs("batch")}>Generate batch</button></div>
      </div>
      <div class="batch-strip" id="batchStrip">
        <p class="batch-empty">Generate a batch to explore other worlds.</p>
      </div>
    </section>

    <dialog class="export-preview-dialog" id="export-preview-dialog" aria-labelledby="export-preview-title">
      <div class="export-preview-header">
        <h2 id="export-preview-title">Export preview</h2>
        <button type="button" data-export-preview-close>Close</button>
      </div>
      <p class="export-note preview-description" data-preview-description></p>
      <div class="export-checkerboard">
        <canvas id="export-preview-canvas" width="256" height="256" aria-label="Exported planet on a transparency grid"></canvas>
      </div>
      <div class="export-preview-playback" data-export-preview-playback hidden>
        <output data-preview-frame>Frame 1</output>
        <button type="button" data-animation-preview-toggle>Pause</button>
      </div>
      <p class="export-preview-caption">Checkerboard represents transparency. Preview only; your planet settings are unchanged.</p>
    </dialog>

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
  const label = shortcuts.find((shortcut) => shortcut.action === action)?.label || action;
  return ` title="${escapeAttr(label)} (${displayShortcut(hotkey)})" aria-label="${escapeAttr(label)}" aria-keyshortcuts="${ariaKeys}"`;
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
      const help = field.querySelector?.("[data-control-hint]");
      if (help) {
        help.textContent = enabled ? "" : reason;
        help.hidden = enabled;
      }
    }
  });

  document.querySelectorAll("[data-value]").forEach((el) => {
    const value = state[el.dataset.value];
    el.textContent = typeof value === "number" && !Number.isInteger(value)
      ? value.toFixed(2)
      : String(value);
  });

  document.querySelectorAll("[data-dependent-controls]").forEach((group) => {
    group.hidden = group.dataset.dependentControls === "Moons"
      ? Number(state.moons) === 0
      : !state.rings && Number(state.body) !== 8;
  });
  document.querySelectorAll("[data-palette]").forEach((button) => {
    button.setAttribute("aria-pressed", String(button.dataset.palette === state.palette));
  });
  const swatches = document.querySelector?.("[data-current-palette]");
  if (swatches && swatches.dataset.palette !== state.palette) {
    swatches.dataset.palette = state.palette;
    swatches.innerHTML = paletteColors(state.palette);
    swatches.setAttribute("aria-label", `${state.palette} palette colors`);
  }
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
  const pin = document.querySelector?.('[data-preference="pinPreview"]');
  if (pin) pin.checked = preferences.pinPreview !== false;
  const mini = document.querySelector?.("[data-mini-preview]");
  if (mini) mini.hidden = preferences.pinPreview === false;
  const mode = document.querySelector?.('[data-preference="variationMode"]');
  if (mode) mode.value = preferences.variationMode;
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

export function syncExportUi(options) {
  const preset = document.querySelector?.("[data-export-preset]");
  if (preset) preset.value = options.preset;
  document.querySelectorAll("[data-export-option]").forEach((checkbox) => {
    checkbox.checked = Boolean(options[checkbox.dataset.exportOption]);
    checkbox.disabled = checkbox.dataset.exportOption === "stars" && options.transparent;
  });
  const summary = document.querySelector?.("[data-export-summary]");
  if (summary) summary.textContent = options.transparent
    ? "Transparent PNG, GIF, APNG and spritesheet. Stars excluded. WebM always uses the full scene."
    : "Opaque PNG, GIF, APNG and spritesheet. WebM always uses the full scene.";
}
export function syncAnimationUi(settings, { busy = false } = {}) {
  document.querySelectorAll("[data-animation-setting]").forEach((input) => {
    const value = settings[input.dataset.animationSetting];
    if (input.type === "checkbox") input.checked = Boolean(value);
    else input.value = String(value);
  });
  const description = document.querySelector?.("[data-loop-description]");
  if (description) description.textContent = settings.seamless
    ? "One complete rotation. Clouds, moon orbits and other effects stay fixed for a smooth loop. Applies to animation and spritesheets."
    : "Effects advance naturally over time. The end may not match the start. Applies to animation and spritesheets.";
  const summary = animationSummary(settings);
  const output = document.querySelector?.("[data-animation-summary]");
  if (output) {
    output.textContent = summary.text;
    output.dataset.invalid = String(!summary.valid);
  }
  for (const name of ["previewAnimation", "exportApng", "exportGif"]) {
    const button = document.querySelector?.('[data-action="' + name + '"]');
    if (button) button.disabled = busy || !summary.valid;
  }
}
export function syncTimelineUi(seconds, isPlaying) {
  const scrub = document.querySelector?.("[data-timeline]");
  if (scrub && document.activeElement !== scrub) {
    scrub.max = String(Math.max(Number(scrub.max) || 60, Math.ceil((seconds + 1) / 60) * 60));
    scrub.value = String(seconds);
  }
  const playback = document.querySelector?.("[data-playback-toggle]");
  if (playback) {
    playback.textContent = isPlaying ? "Pause" : "Play";
    playback.setAttribute("aria-label", isPlaying ? "Pause animation" : "Play animation");
  }
  const label = document.querySelector?.("[data-playhead]");
  if (label) label.textContent = `${seconds.toFixed(1)}s`;
  if (scrub) scrub.setAttribute("aria-valuetext", `${seconds.toFixed(1)} seconds, ${isPlaying ? "playing" : "paused"}`);
}

function exportSettingsTemplate(section) {
  const controls = (keys) => section.controls.filter((control) => keys.includes(control.key || control.action)).map(controlTemplate).join("");
  const labels = {
    "full-scene": "Full scene · as previewed",
    "planet-only": "Planet only · transparent",
    "planet-rings": "Planet + rings · transparent",
  };
  const options = Object.keys(exportPresets).map((name) =>
    '<option value="' + name + '">' + labels[name] + '</option>').join("");
  return '<div class="export-settings control-wide">' +
    controls(["size"]) +
    '<label class="field" for="export-preset">' +
      '<span class="field-label">Export layers</span>' +
      '<select id="export-preset" data-export-preset>' + options +
        '<option value="custom" disabled>Custom layers</option></select></label>' +
    '<details class="export-layer-details"><summary>Customize layers</summary>' +
      '<div class="export-layer-grid">' +
        '<label><input type="checkbox" data-export-option="transparent" /> Transparent background</label>' +
        '<label><input type="checkbox" data-export-option="rings" /> Rings</label>' +
        '<label><input type="checkbox" data-export-option="moons" /> Moons</label>' +
        '<label><input type="checkbox" data-export-option="glow" /> Outer glow</label>' +
        '<label><input type="checkbox" data-export-option="stars" /> Stars</label>' +
      '</div></details>' +
    '<p class="export-note" data-export-summary></p>' +
    '<div class="png-export-actions"><button type="button" data-action="previewExport">Preview PNG</button>' +
      '<button type="button" class="button-primary" data-action="exportPng">Download PNG</button></div>' +
    '<label class="animation-toggle"><input data-animation-setting="seamless" type="checkbox" /> Seamless rotation</label>' +
    '<p class="export-note" data-loop-description></p>' +
    '<details class="animation-export-details">' +
      '<summary>Animated exports · GIF / APNG</summary>' +
      '<div class="animation-export-settings">' +
        '<div class="animation-inputs">' +
          '<label class="field">Length (seconds)<input data-animation-setting="seconds" type="number" min="1" max="12" step="1" /></label>' +
          '<label class="field">Animation FPS<input data-animation-setting="fps" type="number" min="4" max="30" step="1" /></label>' +
        '</div>' +
        '<label class="animation-toggle"><input data-animation-setting="repeat" type="checkbox" /> Repeat continuously</label>' +
        '<p class="export-note" data-animation-summary></p>' +
        '<div class="export-animation-actions">' +
          '<button type="button" data-action="previewAnimation">Preview loop</button>' +
          '<button type="button" data-export-start data-action="exportApng">Export APNG</button>' +
          '<button type="button" data-export-start data-action="exportGif">Export GIF</button>' +
        '</div>' +
      '</div>' +
    '</details>' +
    '<details class="animation-export-details"><summary>Spritesheet · PNG</summary><div class="control-grid export-format-controls">' +
      controls(["frames", "columns", "sheetSeconds", "exportSheet"]) +
    '</div></details>' +
    '<details class="animation-export-details"><summary>Video · WebM</summary><div class="control-grid export-format-controls">' +
      '<p class="export-note control-wide">Records the full scene in real time. Layer and seamless settings above do not apply.</p>' +
      controls(["videoSeconds", "videoFps", "exportVideo"]) +
    '</div></details>' +
    '<details class="animation-export-details"><summary>Save or load a planet code</summary><div class="control-grid export-format-controls">' +
      controls(["copyCode", "loadCode"]) +
    '</div></details>' +
    '<button type="button" class="cancel-animation-export" data-action="cancelAnimatedExport" hidden>Cancel export</button>' +
    '<p class="export-note" data-export-feedback role="status" aria-live="polite"></p>' +
  '</div>';
}
function sectionTemplate(section) {
  const dependent = section.title === "Moons" || section.title === "Rings";
  const controls = dependent
    ? controlTemplate(section.controls[0]) + `<div class="control-grid control-wide dependent-controls" data-dependent-controls="${section.title}" hidden>${section.controls.slice(1).map(controlTemplate).join("")}</div>`
    : section.controls.map(controlTemplate).join("");
  const expanded = section.title === "World" || section.title === "Surface" ? " open" : "";
  return `
    <details class="control-section" id="section-${section.title.toLowerCase()}"${expanded}>
      <summary class="section-head">
        <h2>${section.title}</h2>
        <span class="section-arrow" aria-hidden="true"></span>
      </summary>
      <div class="control-grid">
        ${section.title === "Moons" ? '<p class="section-note control-wide">Off by default. Add moons to reveal their geology and customize their orbits.</p>' : ""}
        ${section.title === "Rings" ? '<p class="section-note control-wide">Enable rings to shape their tilt, width and detail.</p>' : ""}
        ${section.title === "Export" ? exportSettingsTemplate(section) : controls}
        ${section.title === "World" ? `<button type="button" class="section-reset control-wide" data-action="resetWorld" title="Restore this type’s authored settings while keeping the seed and output settings. You can undo this.">Reset this type · keep seed</button><label class="field field-range control-wide" title="Target animation frame rate, not a guarantee of GPU performance">
          <span class="field-label">Preview FPS target</span>
          <output data-fps-target>30 FPS</output>
          <input data-preference="previewFps" type="range" min="5" max="60" step="5" />
        </label>` : ""}
      </div>
      <a class="section-preview-link" href="#studio">↑ Back to preview</a>
    </details>
  `;
}

function paletteColors(name) {
  return (palettes[name] || palettes.aurora).map((color) => `<span style="background:${color}"></span>`).join("");
}

function controlTemplate(control) {
  const hint = escapeAttr(control.help || "");
  if (control.type === "button") {
    return `<button type="button" class="control-button" data-action="${control.action}"${["exportSheet", "exportVideo"].includes(control.action) ? " data-export-start" : ""} title="${hint}">${control.label}</button>`;
  }

  const key = control.key;
  const common = `data-control="${key}" data-help="${hint}" title="${hint}"`;
  const description = `<small class="control-hint" id="hint-${key}" data-control-hint hidden></small>`;
  const describedBy = `aria-describedby="hint-${key}"`;
  if (control.type === "checkbox") {
    return `
      <label class="field field-check" ${common}>
        <span>${control.label}</span>
        <input data-key="${key}" type="checkbox" ${describedBy} />${description}
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
          <select id="field-${key}" data-key="${key}" ${describedBy}>
            ${control.options.map(([value, label]) => `<option value="${value}">${label}</option>`).join("")}
          </select>
          ${lock}
        </div>
        ${quick}${description}
        ${key === "palette" ? `<div class="palette-colors" role="img" data-current-palette aria-label="Selected palette colors"></div><details class="palette-browser"><summary>Browse palette colors</summary><div class="palette-options" role="group" aria-label="Palette choices">${Object.keys(palettes).map((name) => `<button type="button" data-palette="${name}" aria-pressed="false" aria-label="Use ${name} palette"><span class="palette-colors" aria-hidden="true">${paletteColors(name)}</span><span>${name[0].toUpperCase() + name.slice(1)}</span></button>`).join("")}</div></details>` : ""}
      </div>`;
  }

  if (control.type === "number") {
    return `
      <label class="field" ${common}>
        <span class="field-label">${control.label}</span>
        <input data-key="${key}" type="number" min="${control.min}" max="${control.max}" step="${control.step}" ${describedBy} />${description}
      </label>`;
  }

  const percent = control.type === "percent";
  const min = percent ? 0 : control.min ?? 0;
  const max = percent ? 100 : control.max ?? 1;
  const step = percent ? 1 : control.step ?? 0.01;
  const format = percent ? ' data-format="percent"' : "";
  return `
    <div class="field field-range" ${common}>
      <label class="field-label" for="range-${key}">${control.label}${percent ? " (%)" : ""}</label>
      <input class="precision-number" data-key="${key}" data-precision${format} type="number" min="${min}" max="${max}" step="${step}" aria-label="${control.label} ${percent ? "percentage" : "value"}" ${describedBy} />
      <input id="range-${key}" data-key="${key}"${format} type="range" min="${min}" max="${max}" step="${step}" ${describedBy} />${description}
    </div>`;
}

function escapeAttr(value) {
  return String(value).replaceAll("&", "&amp;").replaceAll('"', "&quot;").replaceAll("<", "&lt;");
}
