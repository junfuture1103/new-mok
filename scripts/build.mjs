// Vinext's immediate process.exit races native build workers on Windows.
// Preserve failure codes; give native callbacks a turn before a successful exit.
if (process.platform === 'win32') {
  const exit = process.exit.bind(process);
  let exiting = false;
  process.exit = (code = 0) => {
    if (Number(code) !== 0) return exit(code);
    if (!exiting) { exiting = true; setTimeout(() => exit(0), 250); }
  };
}
process.argv = [process.execPath, 'vinext', 'build'];
await import('../node_modules/vinext/dist/cli.js');
