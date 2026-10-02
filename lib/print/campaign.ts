/**
 * UTM parameters for the print QR codes, so Umami can attribute visits to the
 * paper issue. Same scheme as the social links (e.g. utm_campaign=numero-zero).
 */
export type PrintQrPlacement = "articolo" | "mappa" | "contro_formazione" | "anteprima";

const ITALIAN_NUMBERS = [
  "zero",
  "uno",
  "due",
  "tre",
  "quattro",
  "cinque",
  "sei",
  "sette",
  "otto",
  "nove",
  "dieci",
  "undici",
  "dodici",
  "tredici",
  "quattordici",
  "quindici",
  "sedici",
  "diciassette",
  "diciotto",
  "diciannove",
  "venti",
];

/** "N. 00" -> "numero-zero"; numbers past twenty keep their digits ("numero-21"). */
export function buildPrintCampaign(issueNumber: string) {
  const digits = issueNumber.match(/\d+/)?.[0];
  if (!digits) return "numero";

  const value = Number(digits);
  return `numero-${ITALIAN_NUMBERS[value] ?? value}`;
}

export function withPrintCampaign(
  url: URL,
  { campaign, placement }: { campaign: string; placement: PrintQrPlacement },
) {
  const tracked = new URL(url);
  tracked.searchParams.set("utm_source", "cartaceo");
  tracked.searchParams.set("utm_medium", "qr");
  tracked.searchParams.set("utm_campaign", campaign);
  tracked.searchParams.set("utm_content", `qr_${placement}`);
  return tracked;
}
