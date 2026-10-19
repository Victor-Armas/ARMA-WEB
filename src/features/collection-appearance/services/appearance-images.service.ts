import type {
  CollectionAppearance,
  AppearanceAssetUrls,
} from "../schemas/appearance.schema";
export async function signAppearanceAssets(
  appearance: CollectionAppearance,
  sign: (path: string) => Promise<string | null>,
): Promise<AppearanceAssetUrls> {
  const paths = [
    appearance.artwork_path,
    appearance.background_path,
    appearance.logo_path,
  ];
  const [artworkUrl, backgroundUrl, logoUrl] = await Promise.all(
    paths.map((path) => (path ? sign(path) : null)),
  );
  return { artworkUrl, backgroundUrl, logoUrl };
}
