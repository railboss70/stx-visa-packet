/**
 * Safari still does not implement ReadableStream async iteration.
 * pdf.js 6 uses `for await (... of stream)` in getTextContent(), which
 * throws "undefined is not a function (near '...e of t...')" on iPhone.
 */
export function polyfillReadableStreamAsyncIterator() {
  if (typeof ReadableStream === "undefined") return;
  const proto = ReadableStream.prototype as ReadableStream<unknown> & {
    [Symbol.asyncIterator]?: () => AsyncIterator<unknown>;
  };
  if (typeof proto[Symbol.asyncIterator] === "function") return;

  Object.defineProperty(proto, Symbol.asyncIterator, {
    configurable: true,
    writable: true,
    value: function streamAsyncIterator(this: ReadableStream<unknown>) {
      const reader = this.getReader();
      return {
        next: () => reader.read(),
        async return() {
          try {
            await reader.cancel();
          } catch {
            /* ignore */
          }
          return { done: true as const, value: undefined };
        },
        [Symbol.asyncIterator]() {
          return this;
        },
      };
    },
  });
}

polyfillReadableStreamAsyncIterator();
