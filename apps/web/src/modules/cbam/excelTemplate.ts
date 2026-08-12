/**
 * Excel Template Generator
 * Generates CBAM Excel template with 5 sheets
 */

import * as ExcelJS from 'exceljs';

/**
 * Generate Excel template with 5 sheets for CBAM data
 * @returns ExcelJS.Workbook - Excel workbook object
 */
export function generateExcelTemplate(): ExcelJS.Workbook {
  const workbook = new ExcelJS.Workbook();

  // Sheet 1: General
  const generalSheet = workbook.addWorksheet('general');
  generalSheet.addRow(['product_name', 'hs_code', 'country', 'period', 'unit', 'quantity_imported']);
  generalSheet.addRow(['Exemple Produit', '12345678', 'Tunisie', '2024-Q1', 'tonne', '1000']);

  // Sheet 2: Energy
  const energySheet = workbook.addWorksheet('energy');
  energySheet.addRow(['type', 'unit', 'quantity', 'FE']);
  energySheet.addRow(['electricity', 'kWh', '50000', '']);
  energySheet.addRow(['gas', 'm³', '10000', '']);
  energySheet.addRow(['steam', 'MJ', '20000', '']);
  energySheet.addRow(['fuel', 'L', '5000', '']);

  // Sheet 3: Materials
  const materialsSheet = workbook.addWorksheet('materials');
  materialsSheet.addRow(['type', 'unit', 'quantity', 'FE']);
  materialsSheet.addRow(['steel', 'tonne', '50', '']);
  materialsSheet.addRow(['aluminium', 'tonne', '20', '']);
  materialsSheet.addRow(['lime', 'tonne', '10', '']);
  materialsSheet.addRow(['coke', 'tonne', '5', '']);

  // Sheet 4: Transport
  const transportSheet = workbook.addWorksheet('transport');
  transportSheet.addRow(['mode', 'distance_km', 'tonnage', 'FE']);
  transportSheet.addRow(['truck', '500', '100', '']);
  transportSheet.addRow(['train', '200', '50', '']);
  transportSheet.addRow(['ship', '1000', '200', '']);

  // Sheet 5: Process
  const processSheet = workbook.addWorksheet('process');
  processSheet.addRow(['process_name', 'unit', 'value']);
  processSheet.addRow(['Processus A', 'tCO2e', '10']);
  processSheet.addRow(['Processus B', 'tCO2e', '5']);

  return workbook;
}




