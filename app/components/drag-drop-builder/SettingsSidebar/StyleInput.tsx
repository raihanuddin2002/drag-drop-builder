import { useRef } from "react";

export interface StyleInputProps {
   value: string;
   onChange?: (value: string) => void;
   onBlur?: (value: string) => void;
   placeholder?: string;
   className?: string;
   type?: string;
   delay?: number; // debounce delay (ms)
}

export const StyleInput: React.FC<StyleInputProps> = ({
   value,
   onChange,
   onBlur,
   placeholder,
   className,
   type = "text",
   delay = 1000,
}) => {
   const timeoutRef = useRef<number | null>(null);
   const inputRef = useRef<HTMLInputElement>(null);

   const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = e.target.value;

      // Clear any pending timeout
      if (timeoutRef.current) {
         clearTimeout(timeoutRef.current);
      }

      // Debounce the onChange callback
      if (onChange) {
         timeoutRef.current = window.setTimeout(() => {
            onChange(newValue);
         }, delay);
      }
   };

   const handleBlur = () => {
      // Clear pending debounce and trigger immediately on blur
      if (timeoutRef.current) {
         clearTimeout(timeoutRef.current);
         timeoutRef.current = null;
      }
      if (inputRef.current) {
         onBlur?.(inputRef.current.value);
      }
   };

   return (
      <input
         ref={inputRef}
         type={type}
         defaultValue={value}
         key={value} // Reset input when value prop changes
         onChange={handleChange}
         onBlur={handleBlur}
         placeholder={placeholder}
         className={className}
      />
   );
};
