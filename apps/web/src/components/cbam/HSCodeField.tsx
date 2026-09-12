/**
 * HSCodeField Component
 * Reusable HS Code input field for CBAM module with validation and tooltip
 */

import React from 'react';
import { Info } from 'lucide-react';
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
  FormDescription,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { useFormContext } from 'react-hook-form';

export interface HSCodeFieldProps {
  /**
   * Name of the field in the form (for react-hook-form)
   * Default: "hs_code"
   */
  name?: string;
  
  /**
   * Optional label text
   * Default: "HS Code"
   */
  label?: string;
  
  /**
   * Optional placeholder text
   * Default: "123456"
   */
  placeholder?: string;
  
  /**
   * Whether the field is required
   * Default: true
   */
  required?: boolean;
  
  /**
   * Optional className for the container
   */
  className?: string;
}

/**
 * Tooltip content explaining what HS Code is
 */
const TOOLTIP_CONTENT = "Le HS Code (Code SH) est un code douanier international à 6 chiffres utilisé pour identifier votre produit dans le commerce mondial. Il est obligatoire pour une déclaration CBAM conforme et figure sur vos documents d'importation.";

/**
 * Helper text displayed under the input
 */
const HELPER_TEXT = "Code douanier international (6 chiffres). Disponible sur vos documents d'importation.";

/**
 * Validates that the HS Code is exactly 6 digits
 */
const validateHSCode = (value: string): boolean | string => {
  if (!value) {
    return 'Le code HS est requis';
  }
  
  // Remove any spaces
  const trimmed = value.trim().replace(/\s/g, '');
  
  // Check if it's exactly 6 digits
  if (!/^\d{6}$/.test(trimmed)) {
    return 'Le code HS doit contenir exactement 6 chiffres';
  }
  
  return true;
};

/**
 * Formats the input value to only allow digits and limit to 6 digits
 */
const formatHSCodeInput = (value: string): string => {
  // Remove all non-digit characters
  const digitsOnly = value.replace(/\D/g, '');
  
  // Limit to 6 digits
  return digitsOnly.slice(0, 6);
};

export const HSCodeField: React.FC<HSCodeFieldProps> = ({
  name = 'hs_code',
  label = 'HS Code',
  placeholder = '123456',
  required = true,
  className,
}) => {
  const form = useFormContext();
  
  return (
    <FormField
      control={form.control}
      name={name}
      rules={{
        required: required ? 'Le code HS est requis' : false,
        validate: validateHSCode,
      }}
      render={({ field }) => (
        <FormItem className={className}>
          <div className="flex items-center gap-2">
            <FormLabel className="text-sm font-medium">
              {label}
              {required && <span className="text-red-500 ml-1">*</span>}
            </FormLabel>
            <Popover>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className="inline-flex items-center justify-center rounded-[4px] hover:bg-gray-100 p-1 transition-colors"
                  aria-label="Information sur le code HS"
                >
                  <Info className="h-4 w-4 text-gray-500" />
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-80 p-4" side="right" align="start">
                <p className="text-sm text-gray-700 leading-relaxed">
                  {TOOLTIP_CONTENT}
                </p>
              </PopoverContent>
            </Popover>
          </div>
          
          <FormControl>
            <Input
              {...field}
              type="text"
              inputMode="numeric"
              placeholder={placeholder}
              maxLength={6}
              className="font-mono"
              onChange={(e) => {
                // Format input: only digits, max 6
                const formatted = formatHSCodeInput(e.target.value);
                field.onChange(formatted);
              }}
              onBlur={(e) => {
                // Trim spaces on blur
                const trimmed = e.target.value.trim();
                field.onChange(trimmed);
                field.onBlur();
              }}
            />
          </FormControl>
          
          <FormDescription className="text-sm text-gray-500">
            {HELPER_TEXT}
          </FormDescription>
          
          <FormMessage />
        </FormItem>
      )}
    />
  );
};

/**
 * Standalone version that can be used without react-hook-form
 * Useful for simple forms or when not using FormProvider
 */
export interface StandaloneHSCodeFieldProps {
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  error?: string;
  label?: string;
  placeholder?: string;
  required?: boolean;
  className?: string;
}

export const StandaloneHSCodeField: React.FC<StandaloneHSCodeFieldProps> = ({
  value,
  onChange,
  onBlur,
  error,
  label = 'HS Code',
  placeholder = '123456',
  required = true,
  className,
}) => {
  const [localError, setLocalError] = React.useState<string | undefined>(error);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatHSCodeInput(e.target.value);
    onChange(formatted);
    
    // Validate on change
    if (formatted.length > 0 && formatted.length !== 6) {
      setLocalError('Le code HS doit contenir exactement 6 chiffres');
    } else {
      setLocalError(undefined);
    }
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const trimmed = e.target.value.trim();
    onChange(trimmed);
    
    // Final validation
    if (required && !trimmed) {
      setLocalError('Le code HS est requis');
    } else if (trimmed && trimmed.length !== 6) {
      setLocalError('Le code HS doit contenir exactement 6 chiffres');
    } else {
      setLocalError(undefined);
    }
    
    onBlur?.();
  };

  return (
    <div className={className}>
      <div className="flex items-center gap-2 mb-2">
        <label className="text-sm font-medium">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
        <Popover>
          <PopoverTrigger asChild>
            <button
              type="button"
              className="inline-flex items-center justify-center rounded-[4px] hover:bg-gray-100 p-1 transition-colors"
              aria-label="Information sur le code HS"
            >
              <Info className="h-4 w-4 text-gray-500" />
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-80 p-4" side="right" align="start">
            <p className="text-sm text-gray-700 leading-relaxed">
              {TOOLTIP_CONTENT}
            </p>
          </PopoverContent>
        </Popover>
      </div>
      
      <Input
        type="text"
        inputMode="numeric"
        placeholder={placeholder}
        value={value}
        maxLength={6}
        className={`font-mono ${localError || error ? 'border-red-500' : ''}`}
        onChange={handleChange}
        onBlur={handleBlur}
      />
      
      <p className="text-sm text-gray-500 mt-1.5">
        {HELPER_TEXT}
      </p>
      
      {(localError || error) && (
        <p className="text-sm text-red-500 mt-1.5">
          {localError || error}
        </p>
      )}
    </div>
  );
};

