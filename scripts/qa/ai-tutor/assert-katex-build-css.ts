import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

type JsonRecord = Readonly<Record<string, unknown>>;

type AppBuildManifest = Readonly<{
  pages: Readonly<Record<string, readonly string[]>>;
}>;

const nextBuildDirectory = resolve(process.cwd(), '.next');
const appBuildManifestPath = resolve(nextBuildDirectory, 'app-build-manifest.json');

function isJsonRecord(value: unknown): value is JsonRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseAppBuildManifest(source: string): AppBuildManifest {
  const parsed: unknown = JSON.parse(source);
  if (!isJsonRecord(parsed) || !isJsonRecord(parsed.pages)) {
    throw new Error('Next app-build-manifest.json does not contain a pages record.');
  }

  const pages: Record<string, readonly string[]> = {};
  for (const [route, assets] of Object.entries(parsed.pages)) {
    if (!Array.isArray(assets) || !assets.every((asset) => typeof asset === 'string')) {
      throw new Error(`Next app-build-manifest.json has invalid assets for ${route}.`);
    }
    pages[route] = assets;
  }

  return { pages };
}

function rootLayoutCssAssets(manifest: AppBuildManifest): readonly string[] {
  const rootLayoutAssets = manifest.pages['/layout'];
  if (!rootLayoutAssets) {
    throw new Error('Next app-build-manifest.json has no /layout asset entry.');
  }

  const cssAssets = rootLayoutAssets.filter((asset) => asset.startsWith('static/css/') && asset.endsWith('.css'));
  if (cssAssets.length === 0) {
    throw new Error('The root /layout entry does not reference any compiled CSS assets.');
  }

  return cssAssets;
}

function readRootLayoutCssAssets(assets: readonly string[]): readonly string[] {
  return assets.map((asset) => {
    const assetPath = resolve(nextBuildDirectory, asset);
    if (!existsSync(assetPath)) {
      throw new Error(`Compiled root-layout CSS asset is missing: ${asset}`);
    }
    return readFileSync(assetPath, 'utf8');
  });
}

function assertKaTeXProductionStyles(css: string): void {
  if (!/@font-face\{[^}]*font-family:KaTeX_Main/.test(css)) {
    throw new Error('Root-layout CSS is missing the KaTeX_Main @font-face declaration.');
  }
  if (!/\.katex \.mfrac \.frac-line\{/.test(css)) {
    throw new Error('Root-layout CSS is missing the KaTeX fraction-line rule.');
  }
  if (!/url\((?:\.\.\/media\/|\/_next\/static\/media\/)[A-Za-z0-9_.-]+\.(?:woff2|woff|ttf)\)/.test(css)) {
    throw new Error('Root-layout CSS is missing compiled KaTeX font asset references.');
  }
}

if (!existsSync(appBuildManifestPath)) {
  throw new Error('Missing .next/app-build-manifest.json. Run npm run build before this production CSS probe.');
}

const manifest = parseAppBuildManifest(readFileSync(appBuildManifestPath, 'utf8'));
const cssAssets = rootLayoutCssAssets(manifest);
const compiledRootLayoutCss = readRootLayoutCssAssets(cssAssets).join('\n');
assertKaTeXProductionStyles(compiledRootLayoutCss);

console.log(
  `KaTeX production CSS verified in root /layout assets: ${cssAssets.join(', ')} (font-face, fraction rule, font references).`,
);
