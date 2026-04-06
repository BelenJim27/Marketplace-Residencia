export function serializeBigInts<T>(value: T): T {
  return JSON.parse(
    JSON.stringify(value, (_key, current) => (typeof current === 'bigint' ? current.toString() : current)),
  ) as T;
}

export function toBigIntId(value: string | number | bigint): bigint {
  return BigInt(value);
}
