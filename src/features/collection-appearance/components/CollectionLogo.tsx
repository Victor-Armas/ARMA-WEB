import { useState } from "react";
import armaLogo from "@/assets/arma-logo.webp";
export function CollectionLogo({
  url,
  footer = false,
}: {
  url: string | null;
  footer?: boolean;
}) {
  const [failed, setFailed] = useState<string | null>(null);
  const custom = Boolean(url && url !== failed);
  return (
    <img
      src={custom ? (url ?? armaLogo) : armaLogo}
      alt="ARMA"
      width={160}
      height={64}
      onError={() => {
        if (url) setFailed(url);
      }}
      className={`${footer ? "h-14 w-32 sm:h-16 sm:w-40" : "h-10 w-24 min-[380px]:w-28 sm:h-14 sm:w-36"} object-contain object-left ${custom ? "" : "brightness-0 invert"}`}
    />
  );
}
