// inject.js
(function () {
  const originalConsole = {
    log: console.log.bind(console),
    warn: console.warn.bind(console),
    error: console.error.bind(console),
    debug: console.debug.bind(console),
  };

  ["log", "warn", "error", "debug"].forEach((method) => {
    const original = console[method];
    console[method] = function (...args) {
      window.postMessage(
        {
          type: "CONSOLE_CAPTURE",
          method,
          args: args.map((arg) => {
            try {
              return JSON.parse(JSON.stringify(arg));
            } catch (e) {
              return String(arg);
            }
          }),
        },
        "*"
      );
      original.apply(console, args);
    };
  });
})();
