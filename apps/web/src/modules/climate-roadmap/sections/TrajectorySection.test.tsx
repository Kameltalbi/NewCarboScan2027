import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { TrajectorySection } from "./TrajectorySection";
import type { ClimateRoadmap } from "../types";

const roadmap = {
  id: "r1",
  organization_id: "o1",
  name: "Plan",
  description: null,
  baseline_year: 2020,
  target_year: 2024,
  reduction_target_percent: null,
  baseline_emissions_tco2e: 1000,
  target_emissions_tco2e: null,
  status: "active",
  created_by: null,
  created_at: "",
  updated_at: "",
} as ClimateRoadmap;

describe("TrajectorySection", () => {
  it("n'affiche pas de courbe tant que le pourcentage est vide", () => {
    render(
      <MemoryRouter>
        <TrajectorySection roadmap={roadmap} actuals={[]} onSave={async () => undefined} />
      </MemoryRouter>,
    );
    expect(screen.getByTestId("trajectory-empty")).toBeInTheDocument();
    expect(screen.queryByTestId("reduction-trajectory-chart")).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Ouvrir les actions de réduction" })).toHaveAttribute(
      "href",
      "/app/net-zero?tab=actions",
    );
  });
});
