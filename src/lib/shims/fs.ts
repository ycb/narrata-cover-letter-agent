// Browser shim for Node's fs module (should never be used at runtime).
export const readFile = (...args: any[]) => {
  const callback = args[args.length - 1];
  if (typeof callback === 'function') {
    callback(new Error('fs.readFile is not available in the browser.'));
  }
};

export default { readFile };
