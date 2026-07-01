const txMock = vi.hoisted(() => ({
  observabilitySession: { upsert: vi.fn() },
  observabilityEvent: { create: vi.fn() },
  errorGroup: { findUnique: vi.fn(), findFirst: vi.fn(), update: vi.fn(), create: vi.fn() },
  errorOccurrence: { create: vi.fn(), findMany: vi.fn() },
}));

const prismaMock = vi.hoisted(() => ({
  $transaction: vi.fn(async (callback: (tx: typeof txMock) => unknown) => callback(txMock)),
}));

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));

import { observabilityErrorsRepository } from "@/lib/server/modules/observability-errors/repository";

function createEntry() {
  const now = new Date("2026-07-01T10:00:00.000Z");

  return {
    session: null,
    event: {
      sessionId: "session-1",
      visitorHash: "visitor-1",
      type: "server_error",
      path: "/cms/articles/1/edit",
      requestId: "request-1",
      sampleRate: 1,
      receivedAtServer: now,
    },
    group: {
      fingerprint: "fingerprint-1",
      fingerprintVersion: 1,
      errorSignature: "signature-1",
      title: "Publish failed",
      source: "SERVER" as const,
      severity: "HIGH" as const,
      impactArea: "EDITORIAL" as const,
      userImpact: "BLOCKED_ACTION" as const,
      priorityScore: 90,
      priorityReasons: ["severity:high", "blocked_action"],
      release: "release-2",
      path: "/cms/articles/1/edit",
    },
    occurrence: {
      sessionId: "session-1",
      requestId: "request-1",
      path: "/cms/articles/1/edit",
      routePath: "/cms/articles/[id]/edit",
      method: "POST",
      statusCode: 500,
      actionContext: "publish",
      occurredAt: now,
    },
  };
}

describe("observability errors repository", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    txMock.observabilityEvent.create.mockResolvedValue({ id: "event-1" });
    txMock.errorOccurrence.create.mockResolvedValue({
      id: "occurrence-1",
      errorGroupId: "group-1",
    });
    txMock.errorOccurrence.findMany.mockResolvedValue([{ sessionId: "session-1" }]);
  });

  it("reopens resolved fingerprint regressions and updates distinct affected sessions", async () => {
    txMock.errorGroup.findUnique.mockResolvedValue({
      id: "group-1",
      affectedPaths: ["/old"],
      status: "RESOLVED",
      resolvedAt: new Date("2026-07-01T09:00:00.000Z"),
      regression: false,
      lastRelease: "release-1",
      severity: "HIGH",
    });
    txMock.errorGroup.update.mockResolvedValue({ id: "group-1" });

    await observabilityErrorsRepository.recordOccurrence(createEntry());

    expect(txMock.errorGroup.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "group-1" },
        data: expect.objectContaining({
          regression: true,
          status: "OPEN",
          priorityScore: 100,
          priorityReasons: ["severity:high", "blocked_action", "regression", "release_changed"],
        }),
      }),
    );
    expect(txMock.errorOccurrence.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { errorGroupId: "group-1", sessionId: { not: null } },
        distinct: ["sessionId"],
      }),
    );
  });

  it("marks cross-fingerprint resolved signature matches as regressions", async () => {
    txMock.errorGroup.findUnique.mockResolvedValue(null);
    txMock.errorGroup.findFirst.mockResolvedValue({ id: "old-group" });
    txMock.errorGroup.create.mockResolvedValue({ id: "group-1" });

    await observabilityErrorsRepository.recordOccurrence(createEntry());

    expect(txMock.errorGroup.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          regression: true,
          priorityReasons: ["severity:high", "blocked_action", "regression"],
        }),
      }),
    );
  });
});
