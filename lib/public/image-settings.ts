export type PublicImageSettings = {
  grayscale: boolean;
  fit: "cover" | "contain";
  positionX: number;
  positionY: number;
  zoom: number;
};

export const defaultPublicImageSettings: PublicImageSettings = {
  grayscale: true,
  fit: "cover",
  positionX: 50,
  positionY: 50,
  zoom: 100,
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object";
}

function isPercentage(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 100;
}

function isZoom(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 100 && value <= 150;
}

function isFit(value: unknown): value is PublicImageSettings["fit"] {
  return value === "cover" || value === "contain";
}

export function resolvePublicImageSettings(value: unknown): PublicImageSettings {
  if (!isRecord(value)) return defaultPublicImageSettings;

  const grayscale = value.grayscale ?? defaultPublicImageSettings.grayscale;
  const fit = value.fit ?? defaultPublicImageSettings.fit;
  const positionX = value.positionX ?? defaultPublicImageSettings.positionX;
  const positionY = value.positionY ?? defaultPublicImageSettings.positionY;
  const zoom = value.zoom ?? defaultPublicImageSettings.zoom;

  if (
    typeof grayscale !== "boolean" ||
    !isFit(fit) ||
    !isPercentage(positionX) ||
    !isPercentage(positionY) ||
    !isZoom(zoom)
  ) {
    return defaultPublicImageSettings;
  }

  return { grayscale, fit, positionX, positionY, zoom };
}
