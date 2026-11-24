import { Archivo, Spectral } from "next/font/google";

/**
 * Single source for the site fonts. The root layout and `global-error.tsx`
 * (which renders its own <html>) share these instances, so Next emits one
 * @font-face stylesheet and one set of preloads instead of two.
 */
export const archivo = Archivo({
  variable: "--font-archivo",
  weight: ["400", "500", "600", "700", "800", "900"],
  subsets: ["latin"],
});

// Weight 300 is intentionally not loaded: no rendered UI uses it, and each
// static Spectral weight adds two preloaded files (normal + italic).
export const spectral = Spectral({
  variable: "--font-spectral",
  weight: ["400", "600"],
  style: ["normal", "italic"],
  subsets: ["latin"],
});
