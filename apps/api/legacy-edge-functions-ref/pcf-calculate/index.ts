import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ─── Default Emission Factors (CO2e) ────────────────────────────────
const TRANSPORT_EF: Record<string, number> = { road: 0.062, sea: 0.015, air: 0.602, rail: 0.022, mixed: 0.04 };
const ENERGY_EF: Record<string, { factor: number; unit: string }> = {
  electricite: { factor: 0.057, unit: "kWh" },
  gaz_naturel: { factor: 0.227, unit: "m³" },
  diesel: { factor: 2.68, unit: "L" },
  fioul: { factor: 2.68, unit: "L" },
  propane: { factor: 1.53, unit: "kg" },
  biomasse: { factor: 0.04, unit: "kg" },
};
const WASTE_EF: Record<string, number> = { recycling: -0.5, incineration: 0.5, landfill: 0.1 };
const EOL_EF: Record<string, number> = { recycling: -0.5, incineration: 0.5, landfill: 0.1, reuse: -1.0 };

// ─── ACV Multi-Indicator Default Factors ────────────────────────────
// energy_mj per unit, water_m3 per unit, acidification_kgso2e per unit
const TRANSPORT_ACV: Record<string, { energy: number; water: number; acid: number }> = {
  road:  { energy: 0.85, water: 0.0001, acid: 0.00035 },
  sea:   { energy: 0.20, water: 0.00005, acid: 0.00012 },
  air:   { energy: 8.5,  water: 0.0003, acid: 0.0018 },
  rail:  { energy: 0.30, water: 0.00003, acid: 0.00008 },
  mixed: { energy: 0.55, water: 0.0001, acid: 0.0002 },
};
const ENERGY_ACV: Record<string, { energy: number; water: number; acid: number }> = {
  electricite: { energy: 9.0,   water: 0.002,  acid: 0.0003 },
  gaz_naturel: { energy: 11.7,  water: 0.0001, acid: 0.0001 },
  diesel:      { energy: 42.5,  water: 0.0005, acid: 0.0012 },
  fioul:       { energy: 42.5,  water: 0.0005, acid: 0.0015 },
  propane:     { energy: 46.4,  water: 0.0003, acid: 0.0004 },
  biomasse:    { energy: 15.0,  water: 0.001,  acid: 0.0006 },
};
const MATERIAL_ACV_DEFAULTS = { energy: 30, water: 0.01, acid: 0.005 };
const WASTE_ACV: Record<string, { energy: number; water: number; acid: number }> = {
  recycling:    { energy: -5.0, water: -0.002, acid: -0.001 },
  incineration: { energy: 2.0,  water: 0.001,  acid: 0.003 },
  landfill:     { energy: 0.5,  water: 0.005,  acid: 0.002 },
};
const EOL_ACV: Record<string, { energy: number; water: number; acid: number }> = {
  recycling:    { energy: -5.0, water: -0.002, acid: -0.001 },
  incineration: { energy: 2.0,  water: 0.001,  acid: 0.003 },
  landfill:     { energy: 0.5,  water: 0.005,  acid: 0.002 },
  reuse:        { energy: -8.0, water: -0.003, acid: -0.002 },
};

// ─── Helpers ────────────────────────────────────────────────────────
function convertToKg(quantity: number, unit: string): number {
  switch (unit?.toLowerCase()) {
    case "kg": return quantity;
    case "t": case "tonne": case "tonnes": return quantity * 1000;
    case "g": return quantity / 1000;
    case "l": case "litre": case "litres": return quantity;
    case "m³": case "m3": return quantity * 1000;
    default: return quantity;
  }
}

interface PhaseResult {
  phase: string;
  emissions: number;
  energy_mj: number;
  water_m3: number;
  acidification_kgso2e: number;
  items: number;
  details: any[];
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const study_id = body.study_id;
    const scenario_overrides = body.scenario_overrides || null;
    const is_scenario = !!body.is_scenario;

    if (!study_id) throw new Error("study_id required");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // ─── Fetch all data in parallel ─────────────────────────────────
    const [
      { data: materials },
      { data: transport },
      { data: manufacturing },
      { data: wastes },
      { data: packaging },
      { data: usage },
      { data: endOfLife },
      { data: subcontracting },
      { data: coProducts },
      { data: collectAllocations },
      { data: study },
    ] = await Promise.all([
      supabase.from("pcf_materials").select("*").eq("study_id", study_id),
      supabase.from("pcf_transport").select("*").eq("study_id", study_id),
      supabase.from("pcf_manufacturing").select("*").eq("study_id", study_id),
      supabase.from("pcf_wastes").select("*").eq("study_id", study_id),
      supabase.from("pcf_packaging").select("*").eq("study_id", study_id),
      supabase.from("pcf_usage").select("*").eq("study_id", study_id),
      supabase.from("pcf_end_of_life").select("*").eq("study_id", study_id),
      supabase.from("pcf_subcontracting").select("*").eq("study_id", study_id),
      supabase.from("pcf_co_product_allocations").select("*").eq("study_id", study_id),
      supabase.from("pcf_collect_allocations").select("*").eq("study_id", study_id),
      supabase.from("pcf_studies").select("*").eq("id", study_id).single(),
    ]);

    if (!study) throw new Error("Study not found");

    const isACV = study.study_mode === "acv";
    const breakdown: PhaseResult[] = [];

    const getOverride = (phase: string, key: string) => {
      if (!scenario_overrides?.[phase]) return null;
      return scenario_overrides[phase][key] ?? null;
    };

    // ─── 1. Materials (with scrap rate) ─────────────────────────────
    let matEmissions = 0, matEnergy = 0, matWater = 0, matAcid = 0;
    const matDetails: any[] = [];
    for (const m of materials || []) {
      let ef = m.emission_factor_value;
      if (!ef && m.emission_factor_id) {
        const { data: factor } = await supabase.from("emission_factors").select("emission_factor").eq("id", m.emission_factor_id).single();
        ef = factor?.emission_factor || 2.0;
      }
      ef = ef || 2.0;
      const overrideEf = getOverride("materials", `ef_${m.id}`);
      if (overrideEf !== null) ef = overrideEf;

      const qtyKg = convertToKg(m.quantity, m.unit);
      const scrapMultiplier = 1 + (m.scrap_rate || 0) / 100;
      const effectiveQty = qtyKg * scrapMultiplier;
      const emissions = effectiveQty * ef;
      matEmissions += emissions;

      let itemEnergy = 0, itemWater = 0, itemAcid = 0;
      if (isACV) {
        const eMj = m.energy_mj || MATERIAL_ACV_DEFAULTS.energy;
        const wM3 = m.water_m3 || MATERIAL_ACV_DEFAULTS.water;
        const aSo2 = m.acidification_kgso2e || MATERIAL_ACV_DEFAULTS.acid;
        itemEnergy = effectiveQty * eMj;
        itemWater = effectiveQty * wM3;
        itemAcid = effectiveQty * aSo2;
        matEnergy += itemEnergy;
        matWater += itemWater;
        matAcid += itemAcid;
      }

      matDetails.push({ id: m.id, name: m.material_name, qty: qtyKg, effective: effectiveQty, ef, emissions });

      if (!is_scenario) {
        const updateData: any = { emissions_kg: emissions, emission_factor_value: ef };
        if (isACV) {
          updateData.energy_mj = m.energy_mj || MATERIAL_ACV_DEFAULTS.energy;
          updateData.water_m3 = m.water_m3 || MATERIAL_ACV_DEFAULTS.water;
          updateData.acidification_kgso2e = m.acidification_kgso2e || MATERIAL_ACV_DEFAULTS.acid;
        }
        await supabase.from("pcf_materials").update(updateData).eq("id", m.id);
      }
    }
    breakdown.push({ phase: "materials", emissions: matEmissions, energy_mj: matEnergy, water_m3: matWater, acidification_kgso2e: matAcid, items: materials?.length || 0, details: matDetails });

    // ─── 2. Transport ───────────────────────────────────────────────
    let transEmissions = 0, transEnergy = 0, transWater = 0, transAcid = 0;
    const transDetails: any[] = [];
    for (const t of transport || []) {
      let ef = t.emission_factor_value || TRANSPORT_EF[t.mode] || 0.04;
      const overrideEf = getOverride("transport", `ef_${t.id}`);
      if (overrideEf !== null) ef = overrideEf;
      const tkm = (t.distance_km * t.weight_kg / 1000);
      const emissions = tkm * ef;
      transEmissions += emissions;

      if (isACV) {
        const acv = TRANSPORT_ACV[t.mode] || TRANSPORT_ACV.mixed;
        transEnergy += tkm * (t.energy_mj || acv.energy);
        transWater += tkm * (t.water_m3 || acv.water);
        transAcid += tkm * (t.acidification_kgso2e || acv.acid);
      }

      transDetails.push({ id: t.id, mode: t.mode, distance: t.distance_km, weight: t.weight_kg, ef, emissions });
      if (!is_scenario) {
        await supabase.from("pcf_transport").update({ emissions_kg: emissions, emission_factor_value: ef }).eq("id", t.id);
      }
    }
    breakdown.push({ phase: "transport", emissions: transEmissions, energy_mj: transEnergy, water_m3: transWater, acidification_kgso2e: transAcid, items: transport?.length || 0, details: transDetails });

    // ─── 3. Manufacturing ───────────────────────────────────────────
    let mfgEmissions = 0, mfgEnergy = 0, mfgWater = 0, mfgAcid = 0;
    const mfgDetails: any[] = [];
    for (const m of manufacturing || []) {
      const energyInfo = ENERGY_EF[m.energy_type];
      let ef = m.emission_factor_value || energyInfo?.factor || 0.057;
      const overrideEf = getOverride("manufacturing", `ef_${m.id}`);
      if (overrideEf !== null) ef = overrideEf;
      const emissions = m.quantity * ef;
      mfgEmissions += emissions;

      if (isACV) {
        const acv = ENERGY_ACV[m.energy_type] || ENERGY_ACV.electricite;
        mfgEnergy += m.quantity * (m.energy_mj || acv.energy);
        mfgWater += m.quantity * (m.water_m3 || acv.water);
        mfgAcid += m.quantity * (m.acidification_kgso2e || acv.acid);
      }

      mfgDetails.push({ id: m.id, type: m.energy_type, qty: m.quantity, ef, emissions });
      if (!is_scenario) {
        await supabase.from("pcf_manufacturing").update({ emissions_kg: emissions, emission_factor_value: ef }).eq("id", m.id);
      }
    }
    breakdown.push({ phase: "manufacturing", emissions: mfgEmissions, energy_mj: mfgEnergy, water_m3: mfgWater, acidification_kgso2e: mfgAcid, items: manufacturing?.length || 0, details: mfgDetails });

    // ─── 4. Subcontracting ──────────────────────────────────────────
    let subEmissions = 0, subEnergy = 0, subWater = 0, subAcid = 0;
    const subDetails: any[] = [];
    for (const s of subcontracting || []) {
      const ef = s.emission_factor_value || 0.5;
      const emissions = s.quantity * ef;
      subEmissions += emissions;
      if (isACV) {
        subEnergy += s.quantity * (s.energy_mj || 10);
        subWater += s.quantity * (s.water_m3 || 0.005);
        subAcid += s.quantity * (s.acidification_kgso2e || 0.002);
      }
      subDetails.push({ id: s.id, name: s.process_name, qty: s.quantity, ef, emissions });
      if (!is_scenario) {
        await supabase.from("pcf_subcontracting").update({ emissions_kg: emissions }).eq("id", s.id);
      }
    }
    if (subEmissions > 0 || subEnergy > 0) {
      breakdown.push({ phase: "subcontracting", emissions: subEmissions, energy_mj: subEnergy, water_m3: subWater, acidification_kgso2e: subAcid, items: subcontracting?.length || 0, details: subDetails });
    }

    // ─── 5. Wastes ──────────────────────────────────────────────────
    let wasteEmissions = 0, wasteEnergy = 0, wasteWater = 0, wasteAcid = 0;
    for (const w of wastes || []) {
      const ef = w.emission_factor_value || WASTE_EF[w.treatment] || 0.1;
      const emissions = w.quantity_kg * ef;
      wasteEmissions += emissions;
      if (isACV) {
        const acv = WASTE_ACV[w.treatment] || WASTE_ACV.landfill;
        wasteEnergy += w.quantity_kg * (w.energy_mj || acv.energy);
        wasteWater += w.quantity_kg * (w.water_m3 || acv.water);
        wasteAcid += w.quantity_kg * (w.acidification_kgso2e || acv.acid);
      }
      if (!is_scenario) {
        await supabase.from("pcf_wastes").update({ emissions_kg: emissions, emission_factor_value: ef }).eq("id", w.id);
      }
    }
    breakdown.push({ phase: "wastes", emissions: wasteEmissions, energy_mj: wasteEnergy, water_m3: wasteWater, acidification_kgso2e: wasteAcid, items: wastes?.length || 0, details: [] });

    // ─── 6. Packaging ───────────────────────────────────────────────
    let packEmissions = 0, packEnergy = 0, packWater = 0, packAcid = 0;
    for (const p of packaging || []) {
      const ef = p.emission_factor_value || 1.5;
      const emissions = p.weight_kg * ef;
      packEmissions += emissions;
      if (isACV) {
        packEnergy += p.weight_kg * (p.energy_mj || 20);
        packWater += p.weight_kg * (p.water_m3 || 0.008);
        packAcid += p.weight_kg * (p.acidification_kgso2e || 0.003);
      }
      if (!is_scenario) {
        await supabase.from("pcf_packaging").update({ emissions_kg: emissions, emission_factor_value: ef }).eq("id", p.id);
      }
    }
    breakdown.push({ phase: "packaging", emissions: packEmissions, energy_mj: packEnergy, water_m3: packWater, acidification_kgso2e: packAcid, items: packaging?.length || 0, details: [] });

    // ─── 7. Usage ───────────────────────────────────────────────────
    let useEmissions = 0, useEnergy = 0, useWater = 0, useAcid = 0;
    for (const u of usage || []) {
      const ef = u.emission_factor_value || 0.057;
      const totalUse = (u.lifetime_years || 1) * (u.uses_per_year || 1) * (u.consumption_per_use || 0);
      const emissions = totalUse * ef;
      useEmissions += emissions;
      if (isACV) {
        useEnergy += totalUse * (u.energy_mj || 9.0);
        useWater += totalUse * (u.water_m3 || 0.002);
        useAcid += totalUse * (u.acidification_kgso2e || 0.0003);
      }
      if (!is_scenario) {
        await supabase.from("pcf_usage").update({ emissions_kg: emissions, emission_factor_value: ef }).eq("id", u.id);
      }
    }
    if (useEmissions > 0 || useEnergy > 0) {
      breakdown.push({ phase: "usage", emissions: useEmissions, energy_mj: useEnergy, water_m3: useWater, acidification_kgso2e: useAcid, items: usage?.length || 0, details: [] });
    }

    // ─── 8. End of Life ─────────────────────────────────────────────
    let eolEmissions = 0, eolEnergy = 0, eolWater = 0, eolAcid = 0;
    const totalMaterialWeight = (materials || []).reduce((s: number, m: any) => s + convertToKg(m.quantity, m.unit), 0);
    for (const e of endOfLife || []) {
      const ef = e.emission_factor_value || EOL_EF[e.scenario] || 0.1;
      const weightPortion = totalMaterialWeight * (e.percentage / 100);
      const emissions = weightPortion * ef;
      eolEmissions += emissions;
      if (isACV) {
        const acv = EOL_ACV[e.scenario] || EOL_ACV.landfill;
        eolEnergy += weightPortion * (e.energy_mj || acv.energy);
        eolWater += weightPortion * (e.water_m3 || acv.water);
        eolAcid += weightPortion * (e.acidification_kgso2e || acv.acid);
      }
      if (!is_scenario) {
        await supabase.from("pcf_end_of_life").update({ emissions_kg: emissions, emission_factor_value: ef }).eq("id", e.id);
      }
    }
    if (Math.abs(eolEmissions) > 0 || Math.abs(eolEnergy) > 0) {
      breakdown.push({ phase: "endOfLife", emissions: eolEmissions, energy_mj: eolEnergy, water_m3: eolWater, acidification_kgso2e: eolAcid, items: endOfLife?.length || 0, details: [] });
    }

    // ─── 9. Collect allocations ─────────────────────────────────────
    let collectEmissions = 0;
    if (collectAllocations && collectAllocations.length > 0) {
      for (const ca of collectAllocations) {
        const allocated = ca.allocated_value || 0;
        collectEmissions += allocated;
        const existingPhase = breakdown.find(b => b.phase === ca.phase);
        if (existingPhase) {
          existingPhase.emissions += allocated;
        } else {
          breakdown.push({ phase: ca.phase, emissions: allocated, energy_mj: 0, water_m3: 0, acidification_kgso2e: 0, items: 1, details: [] });
        }
      }
    }

    // ─── Co-product allocation factor ───────────────────────────────
    let allocationFactor = 1.0;
    const mainProduct = (coProducts || []).find((cp: any) => cp.is_main_product);
    if (mainProduct && coProducts && coProducts.length > 1) {
      allocationFactor = (mainProduct.allocation_percentage || 100) / 100;
    }

    const allocatedBreakdown = breakdown.map(b => ({
      ...b,
      emissions: b.emissions * allocationFactor,
      energy_mj: b.energy_mj * allocationFactor,
      water_m3: b.water_m3 * allocationFactor,
      acidification_kgso2e: b.acidification_kgso2e * allocationFactor,
    }));

    const totalEmissions = allocatedBreakdown.reduce((s, b) => s + b.emissions, 0);
    const totalEnergy = allocatedBreakdown.reduce((s, b) => s + b.energy_mj, 0);
    const totalWater = allocatedBreakdown.reduce((s, b) => s + b.water_m3, 0);
    const totalAcid = allocatedBreakdown.reduce((s, b) => s + b.acidification_kgso2e, 0);
    const dominantPhase = [...allocatedBreakdown].sort((a, b) => b.emissions - a.emissions)[0]?.phase || "materials";

    // ─── Persist results ────────────────────────────────────────────
    if (!is_scenario) {
      const studyUpdate: any = { total_emissions: totalEmissions, status: "calculated" };
      if (isACV) {
        studyUpdate.total_energy_mj = totalEnergy;
        studyUpdate.total_water_m3 = totalWater;
        studyUpdate.total_acidification_kgso2e = totalAcid;
      }
      await supabase.from("pcf_studies").update(studyUpdate).eq("id", study_id);

      const { data: existingResults } = await supabase
        .from("pcf_results").select("version")
        .eq("study_id", study_id)
        .order("version", { ascending: false }).limit(1);
      const nextVersion = (existingResults?.[0]?.version || 0) + 1;

      const realCount = [
        ...(materials || []).filter((m: any) => !m.is_estimated),
        ...(transport || []).filter((t: any) => !t.is_estimated),
        ...(manufacturing || []).filter((m: any) => !m.is_estimated),
      ].length;
      const totalCount = (materials?.length || 0) + (transport?.length || 0) + (manufacturing?.length || 0);
      const realPct = totalCount > 0 ? Math.round((realCount / totalCount) * 100) : 30;

      const resultInsert: any = {
        study_id,
        version: nextVersion,
        total_emissions: totalEmissions,
        breakdown: allocatedBreakdown.map(b => ({
          phase: b.phase,
          emissions: b.emissions,
          percentage: totalEmissions > 0 ? (b.emissions / totalEmissions) * 100 : 0,
          isEstimated: false,
          ...(isACV ? { energy_mj: b.energy_mj, water_m3: b.water_m3, acidification_kgso2e: b.acidification_kgso2e } : {}),
        })),
        dominant_phase: dominantPhase,
        data_quality: { realData: realPct, estimatedData: 100 - realPct },
      };
      if (isACV) {
        resultInsert.energy_breakdown = allocatedBreakdown.map(b => ({ phase: b.phase, value: b.energy_mj }));
        resultInsert.water_breakdown = allocatedBreakdown.map(b => ({ phase: b.phase, value: b.water_m3 }));
        resultInsert.acidification_breakdown = allocatedBreakdown.map(b => ({ phase: b.phase, value: b.acidification_kgso2e }));
      }

      await supabase.from("pcf_results").insert(resultInsert);

      return new Response(JSON.stringify({
        success: true,
        study_mode: study.study_mode,
        total_emissions: totalEmissions,
        ...(isACV ? { total_energy_mj: totalEnergy, total_water_m3: totalWater, total_acidification_kgso2e: totalAcid } : {}),
        breakdown: allocatedBreakdown,
        dominant_phase: dominantPhase,
        version: nextVersion,
        allocation_factor: allocationFactor,
        collect_emissions: collectEmissions,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // For scenario simulation
    return new Response(JSON.stringify({
      success: true,
      is_scenario: true,
      study_mode: study.study_mode,
      total_emissions: totalEmissions,
      ...(isACV ? { total_energy_mj: totalEnergy, total_water_m3: totalWater, total_acidification_kgso2e: totalAcid } : {}),
      breakdown: allocatedBreakdown,
      dominant_phase: dominantPhase,
      allocation_factor: allocationFactor,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});