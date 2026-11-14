/**
 * React Native & Hermes safe UUID v4 generator.
 * Does not rely on Node.js 'crypto' global, completely preventing
 * the ReferenceError: Property 'crypto' doesn't exist error in mobile runtimes.
 */
export function uuid(): string {
  let d = Date.now();
  let d2 =
    typeof performance !== 'undefined' && performance.now
      ? Math.floor(performance.now() * 1000)
      : 0;

  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    let r = Math.random() * 16;
    if (d > 0) {
      r = (d + r) % 16 | 0;
      d = Math.floor(d / 16);
    } else {
      r = (d2 + r) % 16 | 0;
      d2 = Math.floor(d2 / 16);
    }
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

export const v4 = uuid;
export default uuid;
