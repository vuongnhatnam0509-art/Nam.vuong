export type ProviderKeys = {
  searates?: string;
  shipsgo?: string;
  jsoncargo?: string;
  aisstream?: string;
};

export function resolvedKeys(incoming?: ProviderKeys): ProviderKeys {
  return {
    searates: incoming?.searates?.trim() || process.env.SEARATES_API_KEY?.trim() || undefined,
    shipsgo: incoming?.shipsgo?.trim() || process.env.SHIPSGO_AUTH_CODE?.trim() || undefined,
    jsoncargo: incoming?.jsoncargo?.trim() || process.env.JSONCARGO_API_KEY?.trim() || undefined,
    aisstream: incoming?.aisstream?.trim() || process.env.AISSTREAM_API_KEY?.trim() || undefined,
  };
}

export function liveProviderNames(incoming?: ProviderKeys): string[] {
  const keys = resolvedKeys(incoming);
  const names: string[] = [];
  if (keys.aisstream) names.push("AISStream");
  if (keys.searates) names.push("SeaRates");
  if (keys.jsoncargo) names.push("JSONCargo");
  if (keys.shipsgo) names.push("ShipsGo");
  return names;
}
