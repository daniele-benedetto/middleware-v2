const navigationServiceMock = vi.hoisted(() => ({
  getPublicNavigation: vi.fn(),
}));

vi.mock("next/cache", () => ({
  cacheLife: vi.fn(),
  cacheTag: vi.fn(),
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
  });

  it("propagates errors when public navigation cannot be loaded", async () => {
    const error = new Error("database unavailable");
    navigationServiceMock.getPublicNavigation.mockRejectedValue(error);

    await expect(getPublicNavigation()).rejects.toBe(error);
  });
});
