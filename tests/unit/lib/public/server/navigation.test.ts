const navigationServiceMock = vi.hoisted(() => ({
  getPublicNavigation: vi.fn(),
  getFallbackPublicNavigation: vi.fn(),
}));

vi.mock("next/cache", () => ({
  cacheLife: vi.fn(),
  cacheTag: vi.fn(),
}));

vi.mock("@/lib/server/modules/navigation", () => ({
  navigationService: navigationServiceMock,
}));

import { getPublicNavigation } from "@/lib/public/server/navigation";

const fallbackNavigation = {
  main: [{ id: "main-home", label: "Numero corrente", href: "/", external: false }],
  footerSections: [],
  footerLegal: [],
};

describe("getPublicNavigation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    navigationServiceMock.getFallbackPublicNavigation.mockReturnValue(fallbackNavigation);
  });

  it("returns public navigation from the service", async () => {
    const navigation = {
      main: [{ id: "custom", label: "Custom", href: "/custom", external: false }],
      footerSections: [],
      footerLegal: [],
    };

    navigationServiceMock.getPublicNavigation.mockResolvedValue(navigation);

    await expect(getPublicNavigation()).resolves.toBe(navigation);
    expect(navigationServiceMock.getFallbackPublicNavigation).not.toHaveBeenCalled();
  });

  it("falls back when public navigation cannot be loaded", async () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);

    navigationServiceMock.getPublicNavigation.mockRejectedValue(new Error("database unavailable"));

    await expect(getPublicNavigation()).resolves.toBe(fallbackNavigation);
    expect(navigationServiceMock.getFallbackPublicNavigation).toHaveBeenCalledWith();

    consoleErrorSpy.mockRestore();
  });
});
