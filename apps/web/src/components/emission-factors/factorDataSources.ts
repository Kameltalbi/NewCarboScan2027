/**
 * Canonical factor databases shown on the catalog "Data sources" panel.
 * Counts come from live facets; metadata (license, geography, description) is static.
 */
export type FactorDataSourceMeta = {
  sourceKey: string;
  /** Distinct datasets / versions exposed in the catalog for this source. */
  datasets: number;
  license: "core";
  dataType: "activity";
  geographyKey:
    | "multiple"
    | "tunisia"
    | "uk"
    | "us"
    | "ipcc_defaults";
  homepage?: string;
};

export const FACTOR_DATA_SOURCES: FactorDataSourceMeta[] = [
  {
    sourceKey: "ademe",
    datasets: 1,
    license: "core",
    dataType: "activity",
    geographyKey: "multiple",
    homepage: "https://base-empreinte.ademe.fr/",
  },
  {
    sourceKey: "internal",
    datasets: 1,
    license: "core",
    dataType: "activity",
    geographyKey: "tunisia",
  },
  {
    sourceKey: "uk_gov_ghg",
    datasets: 1,
    license: "core",
    dataType: "activity",
    geographyKey: "uk",
    homepage:
      "https://www.gov.uk/government/collections/government-conversion-factors-for-company-reporting",
  },
  {
    sourceKey: "epa_ghg_emission_factors_hub",
    datasets: 1,
    license: "core",
    dataType: "activity",
    geographyKey: "us",
    homepage: "https://www.epa.gov/climateleadership/ghg-emission-factors-hub",
  },
  {
    sourceKey: "ipcc_efdb",
    datasets: 1,
    license: "core",
    dataType: "activity",
    geographyKey: "ipcc_defaults",
    homepage: "https://www.ipcc-nggip.iges.or.jp/EFDB/",
  },
];
