import "server-only";

export class StorageError extends Error {
  constructor(
    message: string,
    public readonly code: "NOT_FOUND" | "CONFLICT" | "ACCESS_DENIED" | "INTERNAL_ERROR",
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = "StorageError";
  }
}

export class StorageNotFoundError extends StorageError {
  constructor(message = "Storage object not found", options?: ErrorOptions) {
    super(message, "NOT_FOUND", options);
    this.name = "StorageNotFoundError";
  }
}

export class StorageConflictError extends StorageError {
  constructor(message = "Storage object conflict", options?: ErrorOptions) {
    super(message, "CONFLICT", options);
    this.name = "StorageConflictError";
  }
}

export class StorageAccessError extends StorageError {
  constructor(message = "Storage access denied", options?: ErrorOptions) {
    super(message, "ACCESS_DENIED", options);
    this.name = "StorageAccessError";
  }
}
