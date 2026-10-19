import { z } from "zod";
import { luminance } from "../utils/appearance";
const color = z
  .string()
  .regex(/^#[0-9a-fA-F]{6}$/, "Usa un color hexadecimal de seis dígitos.");
const date = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine(
    (v) =>
      !Number.isNaN(Date.parse(v)) &&
      new Date(v).toISOString().slice(0, 10) === v,
    "Fecha inválida",
  )
  .nullable();
export const colorsSchema = z
  .object({
    paper: color,
    ink: color,
    electric: color,
    acid: color,
    coral: color,
  })
  .strict();
export const imageDefaults = {
  background_path: null,
  background_mode: "cover",
  background_strength: 25,
  background_tile_size: 360,
  logo_path: null,
  artwork_mode: "single",
  artwork_height: 96,
  artwork_position: "top",
} as const;
const imagePath = z
  .string()
  .regex(/^[0-9a-f-]{36}\/[0-9a-f-]{36}\.webp$/)
  .nullable();
export const appearanceSchema = z
  .object({
    background_path: imagePath,
    background_mode: z.enum(["cover", "pattern"]),
    background_strength: z.number().int().min(0).max(60),
    background_tile_size: z.number().int().min(120).max(800),
    logo_path: imagePath,
    artwork_mode: z.enum(["single", "repeat"]),
    artwork_height: z.number().int().min(40).max(240),
    artwork_position: z.enum(["top", "bottom", "both"]),
    preset: z.enum(["arma", "muertos", "christmas"]),
    colors: colorsSchema,
    decoration: z.enum(["none", "muertos", "christmas"]),
    intensity: z.enum(["subtle", "festive"]),
    starts_on: date,
    ends_on: date,
    artwork_path: z
      .string()
      .regex(/^[0-9a-f-]{36}\/[0-9a-f-]{36}\.webp$/)
      .nullable(),
  })
  .strict()
  .refine(
    (v) => luminance(v.colors.paper) >= 0.65,
    "El fondo general debe ser claro. Elige un tono más claro.",
  )
  .refine(
    (v) => luminance(v.colors.ink) <= 0.1,
    "El encabezado y pie deben mantenerse oscuros. Elige un tono más oscuro.",
  )
  .refine(
    (v) => !v.starts_on || !v.ends_on || v.ends_on >= v.starts_on,
    "La fecha final debe ser igual o posterior al inicio.",
  );
export const appearanceRecordSchema = z.object({
  appearance: z.preprocess((value) => {
    const parsed = z.record(z.string(), z.unknown()).safeParse(value);
    return parsed.success ? { ...imageDefaults, ...parsed.data } : value;
  }, appearanceSchema),
  updated_at: z.string(),
});
export type CollectionAppearance = z.infer<typeof appearanceSchema>;
export type CollectionColors = z.infer<typeof colorsSchema>;
export const DEFAULT_APPEARANCE: CollectionAppearance = {
  ...imageDefaults,
  preset: "arma",
  colors: {
    paper: "#f6f6f1",
    ink: "#141414",
    electric: "#2447f5",
    acid: "#d7fc51",
    coral: "#ff754a",
  },
  decoration: "none",
  intensity: "subtle",
  starts_on: null,
  ends_on: null,
  artwork_path: null,
};
export const appearancePresets: {
  id: CollectionAppearance["preset"];
  name: string;
  description: string;
  colors: CollectionColors;
  decoration: CollectionAppearance["decoration"];
}[] = [
  {
    id: "arma",
    name: "ARMA original",
    description: "Azul eléctrico, lima y coral",
    colors: DEFAULT_APPEARANCE.colors,
    decoration: "none",
  },
  {
    id: "muertos",
    name: "Día de Muertos",
    description: "Cempasúchil, morado y papel claro",
    colors: {
      paper: "#fff5df",
      ink: "#221128",
      electric: "#4b175e",
      acid: "#ffbf38",
      coral: "#ff9147",
    },
    decoration: "muertos",
  },
  {
    id: "christmas",
    name: "Navidad",
    description: "Verde profundo, rojo y dorado",
    colors: {
      paper: "#fff9eb",
      ink: "#172a23",
      electric: "#164c3b",
      acid: "#f8df93",
      coral: "#b32d3d",
    },
    decoration: "christmas",
  },
];

export type AppearanceAssetKind = "artwork" | "background" | "logo";
export type AppearanceAssetFiles = Record<AppearanceAssetKind, File | null>;
export interface AppearanceAssetUrls {
  artworkUrl: string | null;
  backgroundUrl: string | null;
  logoUrl: string | null;
}
