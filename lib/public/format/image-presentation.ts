export type EditorialImagePresentation = {
  imageFocalX?: number;
  imageFocalY?: number;
  imageFilter?: "GRAYSCALE" | "COLOR";
  imageZoom?: number;
};

export function getEditorialImageStyle({
  imageFocalX,
  imageFocalY,
  imageZoom,
}: EditorialImagePresentation) {
  const focalX = imageFocalX ?? 50;
  const focalY = imageFocalY ?? 50;

  return {
    objectPosition: `${focalX}% ${focalY}%`,
    transform: `scale(${imageZoom ?? 1})`,
    transformOrigin: `${focalX}% ${focalY}%`,
  };
}

export function getEditorialImageFilterClass({ imageFilter }: EditorialImagePresentation) {
  return imageFilter === "GRAYSCALE" ? "grayscale" : undefined;
}
