import { describe, expect, it } from "vitest";

import { buildPrintCampaign, withPrintCampaign } from "@/lib/print/campaign";

describe("print campaign", () => {
  it("names the campaign after the issue number like the social links", () => {
    expect(buildPrintCampaign("N. 00")).toBe("numero-zero");
    expect(buildPrintCampaign("N. 03")).toBe("numero-tre");
    expect(buildPrintCampaign("N. 21")).toBe("numero-21");
  });

  it("adds the UTM parameters before the fragment", () => {
    const url = withPrintCampaign(new URL("https://middleware.media/uscite/numero#issue-block-m"), {
      campaign: "numero-zero",
      placement: "mappa",
    });

    expect(url.toString()).toBe(
      "https://middleware.media/uscite/numero?utm_source=cartaceo&utm_medium=qr&utm_campaign=numero-zero&utm_content=qr_mappa#issue-block-m",
    );
  });
});
