export function createErrorInstance<TConstructor extends abstract new (...args: never[]) => Error>(
  ErrorClass: TConstructor,
  message = ErrorClass.name,
  properties: Record<string, unknown> = {},
) {
  const error = new Error(message) as Error & Record<string, unknown>;

  Object.setPrototypeOf(error, ErrorClass.prototype);
  Object.assign(error, properties);

  return error as InstanceType<TConstructor>;
}
