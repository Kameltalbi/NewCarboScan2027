/**
 * CBAM Excel Parser
 * Parses Excel file with 5 sheets and returns typed CBAM payload
 */

import * as ExcelJS from 'exceljs';
import type {
  CBAMPayload,
  CBAMGeneralData,
  CBAMEnergyData,
  CBAMMaterialData,
  CBAMTransportData,
  CBAMProcessData,
} from './types';

/**
 * Parse Excel file and extract CBAM data from 5 sheets
 * @param file - Excel file (File object)
 * @returns Promise<CBAMPayload> - Typed CBAM data structure
 */
export async function parseCBAMExcel(file: File): Promise<CBAMPayload> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(arrayBuffer);

    // Parse each sheet
    const general = await parseGeneralSheet(workbook);
    const energy = await parseEnergySheet(workbook);
    const materials = await parseMaterialsSheet(workbook);
    const transport = await parseTransportSheet(workbook);
    const process = await parseProcessSheet(workbook);

    const payload: CBAMPayload = {
      general,
      energy,
      materials,
      transport,
      process,
    };

    return payload;
  } catch (error) {
    throw new Error(`Failed to parse Excel file: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Parse "general" sheet
 */
async function parseGeneralSheet(workbook: ExcelJS.Workbook): Promise<CBAMGeneralData> {
  const worksheet = workbook.getWorksheet('general');
  if (!worksheet) {
    throw new Error('Sheet "general" not found');
  }

  const data: any[][] = [];
  worksheet.eachRow((row, rowNumber) => {
    const rowData: any[] = [];
    row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      rowData[colNumber - 1] = cell.value;
    });
    data[rowNumber - 1] = rowData;
  });
  
  // Find header row
  const headerRow = data.findIndex(row => 
    row.some((cell: any) => 
      String(cell || '').toLowerCase().includes('product_name') || 
      String(cell || '').toLowerCase().includes('product name')
    )
  );

  if (headerRow === -1) {
    throw new Error('Header row not found in "general" sheet');
  }

  const headers = data[headerRow].map((h: any) => String(h || '').toLowerCase().trim());
  const dataRow = data[headerRow + 1] || [];

  const getValue = (fieldName: string): any => {
    const index = headers.findIndex(h => h.includes(fieldName));
    return index >= 0 ? dataRow[index] : null;
  };

  return {
    product_name: String(getValue('product_name') || getValue('product name') || ''),
    hs_code: String(getValue('hs_code') || getValue('hs code') || ''),
    country: String(getValue('country') || ''),
    period: String(getValue('period') || ''),
    unit: String(getValue('unit') || 'tonne'),
    quantity_imported: parseFloat(getValue('quantity_imported') || getValue('quantity') || '0') || 0,
  };
}

/**
 * Parse "energy" sheet
 */
async function parseEnergySheet(workbook: ExcelJS.Workbook): Promise<CBAMEnergyData[]> {
  const worksheet = workbook.getWorksheet('energy');
  if (!worksheet) {
    return [];
  }

  const data: any[][] = [];
  worksheet.eachRow((row, rowNumber) => {
    const rowData: any[] = [];
    row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      rowData[colNumber - 1] = cell.value;
    });
    data[rowNumber - 1] = rowData;
  });

  const headerRow = data.findIndex(row => 
    row.some((cell: any) => String(cell || '').toLowerCase().includes('type'))
  );

  if (headerRow === -1) {
    return [];
  }

  const headers = data[headerRow].map((h: any) => String(h || '').toLowerCase().trim());
  const rows = data.slice(headerRow + 1).filter(row => row.some(cell => cell !== null && cell !== ''));

  return rows.map(row => {
    const getValue = (fieldName: string): any => {
      const index = headers.findIndex(h => h.includes(fieldName));
      return index >= 0 ? row[index] : null;
    };

    return {
      type: String(getValue('type') || ''),
      unit: String(getValue('unit') || ''),
      quantity: parseFloat(getValue('quantity') || '0') || 0,
      FE: getValue('fe') !== null && getValue('fe') !== undefined 
        ? parseFloat(getValue('fe')) 
        : undefined,
    };
  }).filter(item => item.type && item.quantity > 0);
}

/**
 * Parse "materials" sheet
 */
async function parseMaterialsSheet(workbook: ExcelJS.Workbook): Promise<CBAMMaterialData[]> {
  const worksheet = workbook.getWorksheet('materials');
  if (!worksheet) {
    return [];
  }

  const data: any[][] = [];
  worksheet.eachRow((row, rowNumber) => {
    const rowData: any[] = [];
    row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      rowData[colNumber - 1] = cell.value;
    });
    data[rowNumber - 1] = rowData;
  });

  const headerRow = data.findIndex(row => 
    row.some((cell: any) => String(cell || '').toLowerCase().includes('type'))
  );

  if (headerRow === -1) {
    return [];
  }

  const headers = data[headerRow].map((h: any) => String(h || '').toLowerCase().trim());
  const rows = data.slice(headerRow + 1).filter(row => row.some(cell => cell !== null && cell !== ''));

  return rows.map(row => {
    const getValue = (fieldName: string): any => {
      const index = headers.findIndex(h => h.includes(fieldName));
      return index >= 0 ? row[index] : null;
    };

    return {
      type: String(getValue('type') || ''),
      unit: String(getValue('unit') || ''),
      quantity: parseFloat(getValue('quantity') || '0') || 0,
      FE: getValue('fe') !== null && getValue('fe') !== undefined 
        ? parseFloat(getValue('fe')) 
        : undefined,
    };
  }).filter(item => item.type && item.quantity > 0);
}

/**
 * Parse "transport" sheet
 */
async function parseTransportSheet(workbook: ExcelJS.Workbook): Promise<CBAMTransportData[]> {
  const worksheet = workbook.getWorksheet('transport');
  if (!worksheet) {
    return [];
  }

  const data: any[][] = [];
  worksheet.eachRow((row, rowNumber) => {
    const rowData: any[] = [];
    row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      rowData[colNumber - 1] = cell.value;
    });
    data[rowNumber - 1] = rowData;
  });

  const headerRow = data.findIndex(row => 
    row.some((cell: any) => String(cell || '').toLowerCase().includes('mode'))
  );

  if (headerRow === -1) {
    return [];
  }

  const headers = data[headerRow].map((h: any) => String(h || '').toLowerCase().trim());
  const rows = data.slice(headerRow + 1).filter(row => row.some(cell => cell !== null && cell !== ''));

  return rows.map(row => {
    const getValue = (fieldName: string): any => {
      const index = headers.findIndex(h => h.includes(fieldName));
      return index >= 0 ? row[index] : null;
    };

    return {
      mode: String(getValue('mode') || ''),
      distance_km: parseFloat(getValue('distance_km') || getValue('distance') || '0') || 0,
      tonnage: parseFloat(getValue('tonnage') || '0') || 0,
      FE: getValue('fe') !== null && getValue('fe') !== undefined 
        ? parseFloat(getValue('fe')) 
        : undefined,
    };
  }).filter(item => item.mode && item.distance_km > 0 && item.tonnage > 0);
}

/**
 * Parse "process" sheet
 */
async function parseProcessSheet(workbook: ExcelJS.Workbook): Promise<CBAMProcessData[]> {
  const worksheet = workbook.getWorksheet('process');
  if (!worksheet) {
    return [];
  }

  const data: any[][] = [];
  worksheet.eachRow((row, rowNumber) => {
    const rowData: any[] = [];
    row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      rowData[colNumber - 1] = cell.value;
    });
    data[rowNumber - 1] = rowData;
  });

  const headerRow = data.findIndex(row => 
    row.some((cell: any) => String(cell || '').toLowerCase().includes('process_name') || 
      String(cell || '').toLowerCase().includes('process name'))
  );

  if (headerRow === -1) {
    return [];
  }

  const headers = data[headerRow].map((h: any) => String(h || '').toLowerCase().trim());
  const rows = data.slice(headerRow + 1).filter(row => row.some(cell => cell !== null && cell !== ''));

  return rows.map(row => {
    const getValue = (fieldName: string): any => {
      const index = headers.findIndex(h => h.includes(fieldName));
      return index >= 0 ? row[index] : null;
    };

    return {
      process_name: String(getValue('process_name') || getValue('process name') || ''),
      unit: String(getValue('unit') || ''),
      value: parseFloat(getValue('value') || '0') || 0,
    };
  }).filter(item => item.process_name && item.value > 0);
}




