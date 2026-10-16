import { URL } from "node:url";
import process from "node:process";
import { log } from "node:console";
import { readFile, writeFile, copyFile } from "node:fs/promises";

const html = await readFile(
  new URL("../dist/index.html", import.meta.url),
  "utf8",
);
const title = "ARMA · Catálogo de playeras";
const description =
  "Descubre los diseños de ARMA. Fotografías, tallas, colores y precios: encuentra la playera que va contigo.";
const escape = (value) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
const configuredUrl = process.env.VITE_PUBLIC_SITE_URL;
const vercelDomain =
  process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.VERCEL_URL;
const site = configuredUrl || (vercelDomain ? `https://${vercelDomain}` : null);
let absoluteTags = "";
if (site) {
  const url = new URL(site);
  if (url.protocol !== "https:" && url.hostname !== "localhost")
    throw new Error("VITE_PUBLIC_SITE_URL debe usar HTTPS");
  absoluteTags = `<meta property="og:url" content="${escape(new URL("/coleccion", url.origin).href)}" />
    <meta property="og:image" content="${escape(new URL("/arma-catalog-logo.webp", url.origin).href)}" />
    <meta property="og:image:alt" content="ARMA" />
    <meta name="twitter:card" content="summary" />`;
}
const publicHtml = html
  .replace(/<title>.*?<\/title>/s, `<title>${title}</title>`)
  .replace(
    /<meta name="description" content="[^"]*"\s*\/>/,
    `<meta name="description" content="${description}" />`,
  )
  .replace(
    "</head>",
    `<meta property="og:type" content="website" />
    <meta property="og:locale" content="es_MX" />
    <meta property="og:site_name" content="ARMA" />
    <meta property="og:title" content="${title}" />
    <meta property="og:description" content="${description}" />
    ${absoluteTags}
  </head>`,
  );
await writeFile(
  new URL("../dist/catalogo-publico.html", import.meta.url),
  publicHtml,
);
await copyFile(
  new URL("../src/assets/arma-logo.webp", import.meta.url),
  new URL("../dist/arma-catalog-logo.webp", import.meta.url),
);
log("Catálogo público: documento y vista previa preparados.");
