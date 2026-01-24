#!/usr/bin/env node
const { URL } = require('url');

const DEFAULT_ROUTES = ['/'];
const DEFAULT_TIMEOUT_MS = 10000;

const parseArgs = () => {
  const args = process.argv.slice(2);
  const getValue = (flag) => {
    const index = args.indexOf(flag);
    if (index === -1) return null;
    return args[index + 1] || null;
  };

  const url = getValue('--url') || process.env.SMOKE_BASE_URL || null;
  const routesRaw = getValue('--routes') || '';
  const timeoutMs = Number.parseInt(getValue('--timeout') || '', 10) || DEFAULT_TIMEOUT_MS;

  const routes = routesRaw
    ? routesRaw.split(',').map(route => route.trim()).filter(Boolean)
    : DEFAULT_ROUTES;

  return { url, routes, timeoutMs };
};

const fetchWithTimeout = async (targetUrl, timeoutMs) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(targetUrl, { signal: controller.signal });
    const body = await response.text();
    return { response, body };
  } finally {
    clearTimeout(timer);
  }
};

const extractAssets = (html) => {
  const scripts = new Set();
  const links = new Set();

  const scriptRegex = /<script[^>]+src=["']([^"']+)["'][^>]*>/gi;
  let match;
  while ((match = scriptRegex.exec(html)) !== null) {
    scripts.add(match[1]);
  }

  const linkRegex = /<link[^>]+rel=["']stylesheet["'][^>]+href=["']([^"']+)["'][^>]*>/gi;
  while ((match = linkRegex.exec(html)) !== null) {
    links.add(match[1]);
  }

  return {
    scripts: Array.from(scripts),
    styles: Array.from(links),
  };
};

const resolveAssetUrl = (baseUrl, assetPath) => {
  try {
    return new URL(assetPath, baseUrl).toString();
  } catch (error) {
    return null;
  }
};

const requireUrl = (url) => {
  if (!url) {
    console.error('[smoke] Missing --url or SMOKE_BASE_URL');
    process.exit(1);
  }
  return url.endsWith('/') ? url.slice(0, -1) : url;
};

const checkRoute = async (baseUrl, route, timeoutMs) => {
  const target = `${baseUrl}${route.startsWith('/') ? route : `/${route}`}`;
  const { response, body } = await fetchWithTimeout(target, timeoutMs);

  if (!response.ok) {
    throw new Error(`Route ${route} failed with status ${response.status}`);
  }

  if (!body || !body.includes('<html')) {
    throw new Error(`Route ${route} did not return HTML`);
  }

  return body;
};

const checkAssets = async (baseUrl, assets, timeoutMs) => {
  const failures = [];
  const candidates = [...assets.scripts, ...assets.styles].slice(0, 5);

  for (const asset of candidates) {
    const assetUrl = resolveAssetUrl(baseUrl, asset);
    if (!assetUrl) {
      failures.push(`Invalid asset URL: ${asset}`);
      continue;
    }
    try {
      const { response, body } = await fetchWithTimeout(assetUrl, timeoutMs);
      if (!response.ok || !body) {
        failures.push(`Asset fetch failed: ${assetUrl}`);
      }
    } catch (error) {
      failures.push(`Asset fetch error: ${assetUrl}`);
    }
  }

  return failures;
};

const main = async () => {
  const { url, routes, timeoutMs } = parseArgs();
  const baseUrl = requireUrl(url);

  console.log(`[smoke] Base URL: ${baseUrl}`);
  console.log(`[smoke] Routes: ${routes.join(', ')}`);

  let html = '';
  for (const route of routes) {
    console.log(`[smoke] Checking ${route}`);
    html = await checkRoute(baseUrl, route, timeoutMs);
  }

  const assets = extractAssets(html);
  const failures = await checkAssets(baseUrl, assets, timeoutMs);

  if (failures.length > 0) {
    failures.forEach(message => console.error(`[smoke] ${message}`));
    process.exit(1);
  }

  console.log('[smoke] OK');
};

main().catch(error => {
  console.error(`[smoke] Failed: ${error.message}`);
  process.exit(1);
});
