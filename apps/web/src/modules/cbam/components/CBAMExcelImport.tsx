import React, { useCallback, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, Upload, FileText, Loader2 } from 'lucide-react';
import { generateExcelTemplate } from '../excelTemplate';
import { parseCBAMExcel } from '../cbamParser';
import type { CBAMPayload } from '../types';

interface CBAMExcelImportProps {
  onImport: (data: CBAMPayload) => void;
}

export const CBAMExcelImport: React.FC<CBAMExcelImportProps> = ({ onImport }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);

  const handleDownloadTemplate = async () => {
    try {
      const workbook = generateExcelTemplate();
      const fileName = 'CBAM_Template.xlsx';
      
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Template generation error:', error);
    }
  };

  const handleFile = async (file: File) => {
    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
      return;
    }

    setIsParsing(true);
    setFileName(file.name);

    try {
      const payload = await parseCBAMExcel(file);
      onImport(payload);
    } catch (error) {
      console.error('Error parsing Excel:', error);
      setFileName(null);
    } finally {
      setIsParsing(false);
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files[0];
    if (file) {
      handleFile(file);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFile(file);
    }
  };

  return (
    <Card className="border border-gray-200">
      <CardContent className="pt-4 pb-4">
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-gray-900">
            <FileText className="h-4 w-4" />
            Import Excel (optionnel)
          </div>
          
          <p className="text-xs text-gray-600">
            Pré-remplir le formulaire avec un fichier Excel
          </p>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleDownloadTemplate}
            className="w-full"
          >
            <Download className="h-3 w-3 mr-2" />
            Template Excel
          </Button>

          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            className={`border-2 border-dashed rounded-lg p-4 transition-colors ${
              isDragging
                ? 'border-[#009879] bg-green-50'
                : 'border-gray-300 bg-gray-50'
            }`}
          >
            {isParsing ? (
              <div className="flex flex-col items-center gap-2">
                <Loader2 className="h-6 w-6 animate-spin text-[#009879]" />
                <p className="text-xs text-gray-600">Analyse...</p>
              </div>
            ) : fileName ? (
              <div className="flex flex-col items-center gap-1">
                <FileText className="h-6 w-6 text-[#009879]" />
                <p className="text-xs font-medium text-gray-900 text-center truncate w-full">{fileName}</p>
                <p className="text-xs text-green-600">Importé ✓</p>
              </div>
            ) : (
              <>
                <Upload className="h-6 w-6 mx-auto text-gray-400 mb-2" />
                <p className="text-xs text-gray-600 text-center mb-2">
                  Glisser-déposer
                </p>
                <label className="block">
                  <input
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={handleFileInput}
                    className="hidden"
                  />
                  <Button type="button" variant="outline" size="sm" className="w-full" asChild>
                    <span className="cursor-pointer text-xs">
                      <Upload className="h-3 w-3 mr-1" />
                      Choisir fichier
                    </span>
                  </Button>
                </label>
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

