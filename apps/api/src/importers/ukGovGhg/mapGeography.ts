/** Geography rules for UK 2026 — no blanket GB. */

const COUNTRY_BY_NAME: Record<string, string> = {
  argentina: "AR",
  australia: "AU",
  austria: "AT",
  belgium: "BE",
  brazil: "BR",
  canada: "CA",
  chile: "CL",
  china: "CN",
  colombia: "CO",
  "costa rica": "CR",
  "czech republic": "CZ",
  egypt: "EG",
  fiji: "FJ",
  finland: "FI",
  france: "FR",
  germany: "DE",
  greece: "GR",
  "hong kong, china": "HK",
  "hong kong": "HK",
  india: "IN",
  indonesia: "ID",
  ireland: "IE",
  italy: "IT",
  japan: "JP",
  malaysia: "MY",
  mexico: "MX",
  netherlands: "NL",
  "new zealand": "NZ",
  peru: "PE",
  philippines: "PH",
  poland: "PL",
  portugal: "PT",
  romania: "RO",
  russia: "RU",
  "saudi arabia": "SA",
  singapore: "SG",
  "south africa": "ZA",
  "south korea": "KR",
  korea: "KR",
  spain: "ES",
  switzerland: "CH",
  taiwan: "TW",
  thailand: "TH",
  turkey: "TR",
  "united arab emirates": "AE",
  uae: "AE",
  "united states": "US",
  usa: "US",
  vietnam: "VN",
  uk: "GB",
  "uk (london)": "GB",
  "united kingdom": "GB",
};

const UK_DEFAULT_LEVEL1 = new Set([
  "Fuels",
  "Bioenergy",
  "Refrigerant & other",
  "Passenger vehicles",
  "Delivery vehicles",
  "Freighting goods",
  "Business travel- land",
  "Business travel- sea",
  "UK electricity",
  "UK electricity for EVs",
  "UK electricity T&D for EVs",
  "Transmission and distribution",
  "Heat and steam",
  "Water supply",
  "Water treatment",
  "Homeworking",
  "Managed assets- electricity",
  "Managed assets- vehicles",
  "Waste disposal",
  "Material use",
  "Outside of scopes",
  "WTT- fuels",
  "WTT- bioenergy",
  "WTT- UK electricity",
  "WTT- heat and steam",
  "WTT- pass vehs & travel- land",
  "WTT- delivery vehs & freight",
  "WTT- business travel- sea",
]);

function matchCountry(text: string | null): string | null {
  if (!text) return null;
  const key = text.trim().toLowerCase();
  if (COUNTRY_BY_NAME[key]) return COUNTRY_BY_NAME[key];
  // longest substring match
  let best: { code: string; len: number } | null = null;
  for (const [name, code] of Object.entries(COUNTRY_BY_NAME)) {
    if (key.includes(name) && (!best || name.length > best.len)) {
      best = { code, len: name.length };
    }
  }
  return best?.code ?? null;
}

export function mapGeography(input: {
  level1: string | null;
  level2: string | null;
  level3: string | null;
  level4: string | null;
  columnText: string | null;
}): { countryCode: string | null; rule: string; review: boolean; sourceHint: string | null } {
  const l1 = input.level1 ?? "";
  const blob = [input.level2, input.level3, input.level4, input.columnText]
    .filter(Boolean)
    .join(" | ");

  if (l1 === "Hotel stay") {
    const code = matchCountry(input.level3) ?? matchCountry(input.level2) ?? matchCountry(blob);
    if (code) {
      return {
        countryCode: code,
        rule: "hotel_stay:level3_country",
        review: false,
        sourceHint: input.level3 ?? input.level2,
      };
    }
    return {
      countryCode: null,
      rule: "hotel_stay:country_unresolved",
      review: true,
      sourceHint: input.level3,
    };
  }

  if (l1 === "Business travel- air" || l1 === "WTT- business travel- air") {
    return {
      countryCode: null,
      rule: "aviation:route_context_null",
      review: false,
      sourceHint: blob || null,
    };
  }

  const overseas = matchCountry(blob);
  if (overseas && overseas !== "GB" && /overseas|international|country/i.test(blob)) {
    return {
      countryCode: overseas,
      rule: "explicit_non_uk_in_taxonomy",
      review: false,
      sourceHint: blob,
    };
  }

  if (UK_DEFAULT_LEVEL1.has(l1)) {
    return {
      countryCode: "GB",
      rule: `uk_default_family:${l1}`,
      review: false,
      sourceHint: "UK reporting context",
    };
  }

  if (l1.startsWith("WTT-")) {
    return {
      countryCode: "GB",
      rule: `uk_default_wtt:${l1}`,
      review: false,
      sourceHint: "UK reporting context",
    };
  }

  return {
    countryCode: null,
    rule: `geography_unknown:${l1 || "(blank)"}`,
    review: true,
    sourceHint: blob || null,
  };
}
