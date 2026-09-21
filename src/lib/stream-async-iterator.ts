/**
 * Safari still does not implement ReadableStream async iteration,
 * and older WebKit is missing Promise.withResolvers.
 * pdf.js 6 needs both.
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

export function polyfillSafariPdfApis() {
  polyfillReadableStreamAsyncIterator();
  const PromiseCtor = Promise as PromiseConstructor & {
    withResolvers?: <T>() => {
      promise: Promise<T>;
      resolve: (value: T | PromiseLike<T>) => void;
      reject: (reason?: unknown) => void;
    };
  };
  if (typeof PromiseCtor.withResolvers !== "function") {
    PromiseCtor.withResolvers = function withResolvers<T>() {
      let resolve!: (value: T | PromiseLike<T>) => void;
      let reject!: (reason?: unknown) => void;
      const promise = new Promise<T>((res, rej) => {
        resolve = res;
        reject = rej;
      });
      return { promise, resolve, reject };
    };
  }
}

polyfillSafariPdfApis();
