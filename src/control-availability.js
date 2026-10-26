// These rules mirror the branches in the fragment shader. Disabled controls retain
// their values so changing planet type never destroys a customized world.
const rocky = new Set([0, 2, 3, 4, 5, 6]);
const waterWorlds = new Set([0, 2, 3, 4, 6]);
const icyWorlds = new Set([0, 2, 3, 4]);
const ringSettings = new Set([
  "ringRadius", "ringTilt", "ringAngle", "ringWidth",
  "ringOpacity", "ringGaps", "ringDetail",
]);
const moonSettings = new Set(["moonSpread", "moonTilt", "moonSpeed", "moonSize"]);

const unavailable = (reason) => ({ enabled: false, reason });
const available = { enabled: true, reason: "" };

export function controlAvailability(key, state) {
  const body = Number(state.body);
  const isRocky = rocky.has(body);

  if (key === "terrain" && (body === 7 || body === 8))
    return unavailable("Terrain does not affect stars or black holes.");
  if (key === "roughness" && (body === 1 || body === 8))
    return unavailable("Surface roughness does not affect this planet type.");
  if (key === "water" && !waterWorlds.has(body))
    return unavailable("Water level does not affect this planet type.");
  if (key === "ice" && !icyWorlds.has(body))
    return unavailable("Ice caps do not affect this planet type.");
  if (key === "lava" && body !== 3)
    return unavailable("Lava veins only affect lava worlds.");
  if (key === "city" && !isRocky)
    return unavailable("City lights are only available on rocky worlds.");
  if (key === "clouds" && !isRocky)
    return unavailable("Cloud layers are only available on rocky worlds.");
  if (key === "cloudSpeed") {
    if (!isRocky) return unavailable("Cloud layers are unavailable on this planet type.");
    if (Number(state.clouds) === 0) return unavailable("Increase Clouds to enable cloud speed.");
  }
  if (key === "storm" && body !== 1 && body !== 7)
    return unavailable("Storm strength affects gas giants and stars.");
  if (key === "rings" && body === 8)
    return unavailable("Black holes always have a visible accretion disk.");
  if (ringSettings.has(key) && body !== 8 && !state.rings)
    return unavailable("Enable Rings to adjust ring settings.");
  if (moonSettings.has(key) && Number(state.moons) === 0)
    return unavailable("Add at least one moon to adjust its orbit.");
  if (key === "shade" && body === 7)
    return unavailable("Stars emit their own light, so shading does not apply.");
  if ((key === "lightX" || key === "lightY") && (body === 7 || body === 8) && Number(state.moons) === 0)
    return unavailable("The light direction has no visible effect without moons on this body.");

  return available;
}
