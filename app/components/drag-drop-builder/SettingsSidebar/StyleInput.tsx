import { useEffect, useState } from "react";

// Style Input component that uses local state and applies on blur
export interface StyleInputProps {
   value: string;
   onChange: (value: string) => void;
   placeholder?: string;
   className?: string;
   type?: string;
}

export const StyleInput: React.FC<StyleInputProps> = ({ value, onChange, placeholder, className, type = 'text' }) => {
   const [localValue, setLocalValue] = useState(value);

   // Sync local state when external value changes (e.g., selecting different element)
   useEffect(() => {
      setLocalValue(value);
   }, [value]);

   return (
      <input
         type={type}
         value={localValue}
         onChange={(e) => setLocalValue(e.target.value)}
         onBlur={() => {
            if (localValue !== value) {
               onChange(localValue);
            }
         }}
         onKeyDown={(e) => {
            if (e.key === 'Enter') {
               onChange(localValue);
               (e.target as HTMLInputElement).blur();
            }
         }}
         placeholder={placeholder}
         className={className}
      />
   );
};