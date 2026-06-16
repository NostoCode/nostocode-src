/** Strip Mongoose ObjectId / Date wrappers for RSC → client props. */
export function serializeForClient<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}