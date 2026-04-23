type SupportedCmsErrorCode =
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "CONFLICT"
  | "NOT_FOUND"
  | "TOO_MANY_REQUESTS"
  | "BAD_REQUEST"
  | "INTERNAL_SERVER_ERROR";

export type CmsUiError = {
  code: SupportedCmsErrorCode;
  title: string;
  description: string;
  retryable: boolean;
};

type TrpcLikeError = {
  message?: string;
  data?: {
    code?: string;
    details?: unknown;
  };
};

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function readTrpcCode(error: unknown): SupportedCmsErrorCode | undefined {
  if (!isObject(error)) {
    return undefined;
  }

  const data = (error as TrpcLikeError).data;
  const code = data?.code;

  if (
    code === "UNAUTHORIZED" ||
    code === "FORBIDDEN" ||
    code === "CONFLICT" ||
    code === "NOT_FOUND" ||
    code === "TOO_MANY_REQUESTS" ||
    code === "BAD_REQUEST" ||
    code === "INTERNAL_SERVER_ERROR"
  ) {
    return code;
  }

  return undefined;
}

function readBadRequestDetails(error: unknown) {
  if (!isObject(error)) {
    return undefined;
  }

  const details = (error as TrpcLikeError).data?.details;

  if (typeof details === "string") {
    return details;
  }

  if (Array.isArray(details) && details.length > 0 && typeof details[0] === "string") {
    return details[0];
  }

  return undefined;
}

export function mapTrpcErrorToCmsUiMessage(error: unknown): CmsUiError {
  const code = readTrpcCode(error) ?? "INTERNAL_SERVER_ERROR";

  if (code === "UNAUTHORIZED") {
    return {
      code,
      title: "Sessione richiesta",
      description: "Effettua di nuovo l'accesso per continuare.",
      retryable: false,
    };
  }

  if (code === "FORBIDDEN") {
    return {
      code,
      title: "Accesso non consentito",
      description: "Non hai i permessi necessari per completare questa operazione.",
      retryable: false,
    };
  }

  if (code === "CONFLICT") {
    return {
      code,
      title: "Conflitto dati",
      description: "Esiste gia una risorsa con gli stessi dati (es. slug duplicato).",
      retryable: false,
    };
  }

  if (code === "NOT_FOUND") {
    return {
      code,
      title: "Risorsa non trovata",
      description: "La risorsa richiesta non esiste o e stata eliminata.",
      retryable: false,
    };
  }

  if (code === "TOO_MANY_REQUESTS") {
    return {
      code,
      title: "Troppi tentativi",
      description: "Hai raggiunto il limite di richieste. Riprova tra poco.",
      retryable: true,
    };
  }

  if (code === "BAD_REQUEST") {
    const detail = readBadRequestDetails(error);

    return {
      code,
      title: "Dati non validi",
      description: detail ?? "Controlla i dati inseriti e riprova.",
      retryable: false,
    };
  }

  return {
    code: "INTERNAL_SERVER_ERROR",
    title: "Errore imprevisto",
    description: "Si e verificato un errore inatteso. Riprova.",
    retryable: true,
  };
}
