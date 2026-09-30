const fs = require('node:fs');
const path = require('node:path');
const esbuild = require('esbuild');

const sourceDir = path.join(__dirname, 'codes');

function findJavaScriptFiles(directory) {
  if (!fs.existsSync(directory)) return [];

  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const filePath = path.join(directory, entry.name);
    if (entry.isDirectory()) return findJavaScriptFiles(filePath);
    return entry.isFile() && entry.name.endsWith('.js') ? [filePath] : [];
  });
}

async function main() {
  const entryPoints = findJavaScriptFiles(sourceDir).sort();
  if (entryPoints.length === 0) {
    console.log('No JavaScript files found under codes/.');
    return;
  }

  const options = {
    entryPoints,
    outbase: sourceDir,
    outdir: path.join(__dirname, 'dist'),
    bundle: true,
    minify: true,
    platform: 'browser',
    target: 'es2020',
  };

  if (process.argv.includes('--watch')) {
    const context = await esbuild.context(options);
    await context.watch();
    console.log(`Watching ${entryPoints.length} JavaScript file(s) under codes/.`);
  } else {
    await esbuild.build(options);
    console.log(`Built ${entryPoints.length} JavaScript file(s) into dist/.`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
