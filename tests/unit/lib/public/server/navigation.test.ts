const navigationServiceMock = vi.hoisted(() => ({
  getPublicNavigation: vi.fn(),
}));
const cacheLifeMock = vi.hoisted(() => vi.fn());
const cacheTagMock = vi.hoisted(() => vi.fn());

vi.mock("next/cache", () => ({
  cacheLife: cacheLifeMock,
  cacheTag: cacheTagMock,
}));

vi.mock("@/lib/server/modules/navigation", () => ({
  navigationService: navigationServiceMock,
}));

import { getPublicNavigation } from "@/lib/public/server/navigation";

describe("getPublicNavigation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns public navigation from the service", async () => {
    const navigation = {
      main: [{ id: "custom", label: "Custom", href: "/custom", external: false }],
      footerSections: [],
      footerLegal: [],
    };

    navigationServiceMock.getPublicNavigation.mockResolvedValue(navigation);

    await expect(getPublicNavigation()).resolves.toBe(navigation);

    expect(cacheLifeMock).toHaveBeenCalledWith("hours");
    expect(cacheTagMock).toHaveBeenCalledWith("public-navigation");
  });

  it("returns empty navigation when public navigation cannot be loaded", async () => {
    const error = new Error("database unavailable");
    navigationServiceMock.getPublicNavigation.mockRejectedValue(error);

    await expect(getPublicNavigation()).resolves.toEqual({
      main: [],
      footerSections: [],
      footerLegal: [],
    });
  });
});
