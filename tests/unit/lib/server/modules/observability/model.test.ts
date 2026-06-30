import {
  auditOutcomeValues,
  calculateActiveTime,
  calculateContentQualityScore,
  calculateSessionQualityScore,
  createObservabilityErrorFingerprint,
  deriveAuditPublicImpact,
  deriveAuditRiskLevel,
  deriveObservabilityVisitorHash,
  engagementLevelValues,
  errorStatusValues,
  assessLikelyBot,
  evaluateClientTimingSanity,
  hasSensitiveMetadataKey,
  isDerivedField,
  isSampledEventType,
  isRawEventType,
  observabilityDefaults,
  parseObservabilityMetadata,
  observabilityPageTypeValues,
  perceivedQualityValues,
  resolveCollectionMode,
  sumWeightedSampleCounts,
} from "@/lib/server/modules/observability/model";

describe("observability phase 0 vocabulary", () => {
  it("locks the canonical vocabulary", () => {
    expect(observabilityPageTypeValues).toEqual([
      "home",
      "article",
      "issue",
      "static_page",
      "listen",
      "media",
      "cms",
    ]);
    expect(engagementLevelValues).toEqual(["glance", "scan", "engaged", "completed"]);
    expect(perceivedQualityValues).toEqual(["smooth", "acceptable", "frustrating", "broken"]);
    expect(errorStatusValues).toEqual(["open", "investigating", "resolved", "ignored"]);
    expect(auditOutcomeValues).toEqual(["SUCCESS", "FAILURE"]);
    expect(observabilityDefaults.sessionInactivityTimeoutMs).toBe(30 * 60 * 1000);
  });

  it("separates admitted raw events from derived fields", () => {
    expect(isRawEventType("session_start")).toBe(true);
    expect(isRawEventType("page_view")).toBe(false);
    expect(isDerivedField("qualityScore")).toBe(true);
    expect(isDerivedField("receivedAtServer")).toBe(false);
  });
});

describe("observability active time", () => {
  it("counts regular active heartbeats", () => {
    const result = calculateActiveTime([
      { type: "interaction", clientElapsedMs: 0 },
      { type: "heartbeat", clientElapsedMs: 15_000 },
      { type: "interaction", clientElapsedMs: 20_000 },
      { type: "heartbeat", clientElapsedMs: 30_000 },
    ]);

    expect(result.activeTimeMs).toBe(30_000);
    expect(result.discardedGapCount).toBe(0);
  });

  it("does not count a background tab left open", () => {
    const result = calculateActiveTime([
      { type: "interaction", clientElapsedMs: 0 },
      { type: "visibility_hidden", clientElapsedMs: 1_000 },
      { type: "heartbeat", clientElapsedMs: 40 * 60 * 1000 },
    ]);

    expect(result.activeTimeMs).toBe(0);
    expect(result.discardedGapCount).toBe(1);
  });

  it("caps missed heartbeat gaps", () => {
    const result = calculateActiveTime([
      { type: "interaction", clientElapsedMs: 0 },
      { type: "interaction", clientElapsedMs: 290_000 },
      { type: "heartbeat", clientElapsedMs: 5 * 60 * 1000 },
    ]);

    expect(result.activeTimeMs).toBe(20_000);
    expect(result.cappedGapCount).toBe(1);
  });

  it("discards long idle gaps", () => {
    const result = calculateActiveTime([
      { type: "interaction", clientElapsedMs: 0 },
      { type: "heartbeat", clientElapsedMs: 5 * 60 * 1000 },
    ]);

    expect(result.activeTimeMs).toBe(0);
    expect(result.discardedGapCount).toBe(1);
  });

  it("adds page exit time only while still active", () => {
    expect(
      calculateActiveTime([
        { type: "interaction", clientElapsedMs: 0 },
        { type: "page_exit", clientElapsedMs: 10_000 },
      ]).activeTimeMs,
    ).toBe(10_000);
    expect(
      calculateActiveTime([
        { type: "interaction", clientElapsedMs: 0 },
        { type: "page_exit", clientElapsedMs: 60_000 },
      ]).activeTimeMs,
    ).toBe(0);
  });
});

describe("observability quality score", () => {
  it("returns a decomposed session score", () => {
    const result = calculateSessionQualityScore({
      maxEngagementLevel: "engaged",
      engagedPageCount: 3,
      completedAudioCount: 1,
      qualitativeReturnCount: 1,
      rapidBounceAfterPoorPerformance: true,
    });

    expect(result).toEqual({
      score: 70,
      base: 70,
      bonus: { engagedPages: 10, completedAudio: 5, qualitativeReturns: 5 },
      penalties: { rapidBounceAfterPoorPerformance: 20, blockingErrors: 0 },
    });
  });

  it("clamps session scores", () => {
    expect(
      calculateSessionQualityScore({
        maxEngagementLevel: "completed",
        engagedPageCount: 10,
        completedAudioCount: 10,
        qualitativeReturnCount: 10,
      }).score,
    ).toBe(100);
    expect(
      calculateSessionQualityScore({
        maxEngagementLevel: "glance",
        blockingErrorCount: 10,
        rapidBounceAfterPoorPerformance: true,
      }).score,
    ).toBe(0);
  });

  it("returns a decomposed content score and avoids division by zero", () => {
    const result = calculateContentQualityScore({
      totalVisits: 100,
      qualifiedVisits: 50,
      completedReads: 25,
      significantReturns: 10,
      averageActiveTimeMs: 45_000,
      expectedReadingTimeMs: 60_000,
      poorPerformanceSessions: 5,
      errorImpactedSessions: 2,
      sessions: 100,
    });

    expect(result.components).toEqual({
      completionRate: 0.5,
      qualifiedRatio: 0.5,
      returnRate: 0.2,
      activeTimeFit: 0.75,
      perfPenalty: 0.05,
      errorPenalty: 0.02,
    });
    expect(result.score).toBe(41);

    expect(
      calculateContentQualityScore({
        totalVisits: 0,
        qualifiedVisits: 0,
        completedReads: 0,
        significantReturns: 0,
        averageActiveTimeMs: 0,
        expectedReadingTimeMs: 0,
        poorPerformanceSessions: 0,
        errorImpactedSessions: 0,
        sessions: 0,
      }).score,
    ).toBe(0);
  });
});

describe("observability error fingerprint", () => {
  it("normalizes volatile values, line numbers and UUIDs", () => {
    const first = createObservabilityErrorFingerprint({
      errorType: "TypeError",
      message: "Missing article 550e8400-e29b-41d4-a716-446655440000",
      impactArea: "public_site",
      stackFrames: [
        { functionName: "ArticlePage", modulePath: "/repo/app/articoli/[slug]/page.tsx:12:4" },
      ],
    });
    const second = createObservabilityErrorFingerprint({
      errorType: "TypeError",
      message: "Missing article 550e8400-e29b-41d4-a716-446655440111",
      impactArea: "public_site",
      stackFrames: [
        { functionName: "ArticlePage", modulePath: "/repo/app/articoli/[slug]/page.tsx:99:9" },
      ],
    });

    expect(second.fingerprint).toBe(first.fingerprint);
    expect(first.fingerprintVersion).toBe(1);
    expect(first.errorSignature).toContain("public_site");
  });

  it("ignores vendor frames and keeps application frames", () => {
    const result = createObservabilityErrorFingerprint({
      errorType: "Error",
      message: "boom",
      stackFrames: [
        { functionName: "render", modulePath: "node_modules/react/index.js", vendor: true },
        { functionName: "ArticlePage", modulePath: "/repo/app/articoli/[slug]/page.tsx" },
      ],
    });

    expect(result.normalizedParts.join("|")).not.toContain("node_modules");
    expect(result.normalizedParts.join("|")).toContain("articlepage@app/articoli/[slug]/page.tsx");
  });
});

describe("observability privacy and sampling", () => {
  it("keeps visitor hashes stable only within the same UTC day", () => {
    const first = deriveObservabilityVisitorHash({
      ipAddress: "203.0.113.10",
      userAgent: "Test Browser",
      date: new Date("2026-07-01T10:00:00.000Z"),
      saltSecret: "secret",
    });
    const second = deriveObservabilityVisitorHash({
      ipAddress: "203.0.113.10",
      userAgent: "Test Browser",
      date: new Date("2026-07-01T23:00:00.000Z"),
      saltSecret: "secret",
    });
    const third = deriveObservabilityVisitorHash({
      ipAddress: "203.0.113.10",
      userAgent: "Test Browser",
      date: new Date("2026-07-02T00:01:00.000Z"),
      saltSecret: "secret",
    });

    expect(second).toBe(first);
    expect(third).not.toBe(first);
  });

  it("reduces collection when DNT or GPC is present", () => {
    expect(resolveCollectionMode({ doNotTrack: "1" })).toBe("minimal");
    expect(resolveCollectionMode({ globalPrivacyControl: "1" })).toBe("minimal");
    expect(resolveCollectionMode({ consentGranted: false })).toBe("minimal");
    expect(resolveCollectionMode({ consentGranted: true })).toBe("full");
  });

  it("weights sampled counts and identifies sampled event types", () => {
    expect(sumWeightedSampleCounts([{ count: 10, sampleRate: 0.5 }])).toBe(20);
    expect(
      sumWeightedSampleCounts([
        { count: 10, sampleRate: 1 },
        { count: 5, sampleRate: 0.25 },
      ]),
    ).toBe(30);
    expect(isSampledEventType("session_heartbeat")).toBe(true);
    expect(isSampledEventType("scroll_milestone")).toBe(true);
    expect(isSampledEventType("error_occurrence")).toBe(false);
    expect(isSampledEventType("audit_activity")).toBe(false);
  });

  it("rejects sensitive or oversized metadata", () => {
    expect(parseObservabilityMetadata({ component: "ArticlePage", retry: 1 })).toEqual({
      component: "ArticlePage",
      retry: 1,
    });
    expect(parseObservabilityMetadata({ authorization: "Bearer secret" })).toBeUndefined();
    expect(parseObservabilityMetadata({ value: "x".repeat(3000) })).toBeUndefined();
    expect(hasSensitiveMetadataKey("requestToken")).toBe(true);
  });

  it("marks invalid or suspicious client timing", () => {
    expect(evaluateClientTimingSanity({ clientSequence: 1, clientElapsedMs: 1000 })).toEqual({
      accepted: true,
      suspicious: false,
      reasons: [],
    });
    expect(
      evaluateClientTimingSanity({
        clientSequence: 2,
        clientElapsedMs: 900,
        previousClientElapsedMs: 1000,
      }),
    ).toEqual({
      accepted: true,
      suspicious: true,
      reasons: ["negative_client_delta"],
    });
    expect(evaluateClientTimingSanity({ clientSequence: -1, clientElapsedMs: 1000 }).accepted).toBe(
      false,
    );
  });

  it("assesses likely bots with transparent reasons", () => {
    expect(
      assessLikelyBot({
        userAgent: "Googlebot",
        heartbeatCount: 2,
        interactionCount: 0,
        scrollEventCount: 0,
      }),
    ).toEqual({ isLikelyBot: true, reasons: ["bot_user_agent", "no_human_signals"] });
    expect(
      assessLikelyBot({ userAgent: "Mozilla/5.0", heartbeatCount: 2, interactionCount: 1 }),
    ).toEqual({ isLikelyBot: false, reasons: [] });
  });

  it("derives audit public impact and risk from action context", () => {
    expect(
      deriveAuditRiskLevel({
        action: "publish",
        resourceType: "article",
        outcome: "FAILURE",
        isPublishedResource: true,
      }),
    ).toBe("high");
    expect(
      deriveAuditRiskLevel({ action: "change_role", resourceType: "user", outcome: "SUCCESS" }),
    ).toBe("critical");
    expect(
      deriveAuditRiskLevel({ action: "update", resourceType: "article", outcome: "SUCCESS" }),
    ).toBe("low");
    expect(
      deriveAuditPublicImpact({
        action: "update",
        resourceType: "navigation",
        outcome: "SUCCESS",
        isPublicNavigation: true,
      }),
    ).toBe(true);
  });
});
