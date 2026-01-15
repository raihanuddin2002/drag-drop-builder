import { Link2, Unlink2 } from "lucide-react";
import { useState, useEffect } from "react";

interface SpacingEditorProps {
   marginTop: string;
   marginRight: string;
   marginBottom: string;
   marginLeft: string;
   paddingTop: string;
   paddingRight: string;
   paddingBottom: string;
   paddingLeft: string;
   onUpdateStyle: (prop: string, value: string) => void;
}

const parseValue = (value: string): { num: number; unit: string } => {
   if (!value || value === 'auto') return { num: 0, unit: 'px' };
   const match = value.match(/^(-?\d*\.?\d+)(px|em|rem|%)?$/);
   if (match) {
      return { num: parseFloat(match[1]), unit: match[2] || 'px' };
   }
   return { num: 0, unit: 'px' };
};

// Separate component with local state to prevent focus loss
const SpacingInput = ({
   value,
   onChange,
   className = '',
}: {
   value: number;
   onChange: (val: string) => void;
   className?: string;
}) => {
   const [localValue, setLocalValue] = useState(value === 0 ? '' : value.toString());
   const [prevPropValue, setPrevPropValue] = useState(value);

   // Sync local value with prop ONLY when prop actually changes (for external changes like link button)
   useEffect(() => {
      if (value !== prevPropValue) {
         setPrevPropValue(value);
         setLocalValue(value === 0 ? '' : value.toString());
      }
   }, [value, prevPropValue]);

   const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = e.target.value;
      setLocalValue(newValue);
      // Live update - apply changes immediately
      onChange(newValue);
   };

   const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
         (e.target as HTMLInputElement).blur();
      }
   };

   return (
      <input
         type="number"
         value={localValue}
         onChange={handleChange}
         onKeyDown={handleKeyDown}
         className={`w-9 h-6 text-center text-[11px] font-medium bg-transparent border-0 text-gray-600
            focus:outline-none focus:bg-white/80 focus:ring-1 focus:ring-indigo-400 rounded transition-all
            placeholder:text-gray-300 hover:bg-white/50 ${className}`}
         placeholder="0"
      />
   );
};

export const SpacingEditor: React.FC<SpacingEditorProps> = ({
   marginTop,
   marginRight,
   marginBottom,
   marginLeft,
   paddingTop,
   paddingRight,
   paddingBottom,
   paddingLeft,
   onUpdateStyle,
}) => {
   const [unit, setUnit] = useState<'px' | 'em' | 'rem'>('px');
   const [marginLinked, setMarginLinked] = useState(false);
   const [paddingLinked, setPaddingLinked] = useState(false);

   // Parse current values
   const mt = parseValue(marginTop);
   const mr = parseValue(marginRight);
   const mb = parseValue(marginBottom);
   const ml = parseValue(marginLeft);
   const pt = parseValue(paddingTop);
   const pr = parseValue(paddingRight);
   const pb = parseValue(paddingBottom);
   const pl = parseValue(paddingLeft);

   // Handle unit change - reapply all values with new unit
   const handleUnitChange = (newUnit: 'px' | 'em' | 'rem') => {
      setUnit(newUnit);

      // Reapply margin values with new unit
      if (mt.num !== 0) onUpdateStyle('marginTop', `${mt.num}${newUnit}`);
      if (mr.num !== 0) onUpdateStyle('marginRight', `${mr.num}${newUnit}`);
      if (mb.num !== 0) onUpdateStyle('marginBottom', `${mb.num}${newUnit}`);
      if (ml.num !== 0) onUpdateStyle('marginLeft', `${ml.num}${newUnit}`);

      // Reapply padding values with new unit
      if (pt.num !== 0) onUpdateStyle('paddingTop', `${pt.num}${newUnit}`);
      if (pr.num !== 0) onUpdateStyle('paddingRight', `${pr.num}${newUnit}`);
      if (pb.num !== 0) onUpdateStyle('paddingBottom', `${pb.num}${newUnit}`);
      if (pl.num !== 0) onUpdateStyle('paddingLeft', `${pl.num}${newUnit}`);
   };

   // Handle margin link toggle - sync all values when linking
   const handleMarginLinkToggle = () => {
      const newLinked = !marginLinked;
      setMarginLinked(newLinked);

      if (newLinked) {
         // Find the first non-zero value, or use 0
         const syncValue = mt.num || mr.num || mb.num || ml.num || 0;
         const fullValue = `${syncValue}${unit}`;
         onUpdateStyle('marginTop', fullValue);
         onUpdateStyle('marginRight', fullValue);
         onUpdateStyle('marginBottom', fullValue);
         onUpdateStyle('marginLeft', fullValue);
      }
   };

   // Handle padding link toggle - sync all values when linking
   const handlePaddingLinkToggle = () => {
      const newLinked = !paddingLinked;
      setPaddingLinked(newLinked);

      if (newLinked) {
         // Find the first non-zero value, or use 0
         const syncValue = pt.num || pr.num || pb.num || pl.num || 0;
         const fullValue = `${syncValue}${unit}`;
         onUpdateStyle('paddingTop', fullValue);
         onUpdateStyle('paddingRight', fullValue);
         onUpdateStyle('paddingBottom', fullValue);
         onUpdateStyle('paddingLeft', fullValue);
      }
   };

   const handleMarginChange = (side: 'Top' | 'Right' | 'Bottom' | 'Left', value: string) => {
      const numValue = value === '' ? '0' : value;
      const fullValue = `${numValue}${unit}`;

      if (marginLinked) {
         onUpdateStyle('marginTop', fullValue);
         onUpdateStyle('marginRight', fullValue);
         onUpdateStyle('marginBottom', fullValue);
         onUpdateStyle('marginLeft', fullValue);
      } else {
         onUpdateStyle(`margin${side}`, fullValue);
      }
   };

   const handlePaddingChange = (side: 'Top' | 'Right' | 'Bottom' | 'Left', value: string) => {
      const numValue = value === '' ? '0' : value;
      const fullValue = `${numValue}${unit}`;

      if (paddingLinked) {
         onUpdateStyle('paddingTop', fullValue);
         onUpdateStyle('paddingRight', fullValue);
         onUpdateStyle('paddingBottom', fullValue);
         onUpdateStyle('paddingLeft', fullValue);
      } else {
         onUpdateStyle(`padding${side}`, fullValue);
      }
   };

   return (
      <div className="space-y-3">
         {/* Header */}
         <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-700 tracking-wide">Spacing</span>
            <div className="flex items-center gap-1 bg-gray-100 rounded-md p-0.5">
               {(['px', 'em', 'rem'] as const).map((u) => (
                  <button
                     key={u}
                     onClick={() => handleUnitChange(u)}
                     className={`px-2 py-0.5 text-[10px] font-medium rounded transition-all ${
                        unit === u
                           ? 'bg-white text-gray-800 shadow-sm'
                           : 'text-gray-500 hover:text-gray-700'
                     }`}
                  >
                     {u}
                  </button>
               ))}
            </div>
         </div>

         {/* Visual Box Model */}
         <div className="relative">
            {/* Margin Layer */}
            <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl p-1 border border-amber-200/60 shadow-sm">
               {/* Margin Label */}
               <div className="flex items-center justify-between px-2 py-1">
                  <span className="text-[9px] font-semibold text-amber-600/80 uppercase tracking-wider">Margin</span>
                  <button
                     onClick={handleMarginLinkToggle}
                     className={`p-1 rounded-md transition-all ${
                        marginLinked
                           ? 'bg-amber-500 text-white shadow-sm'
                           : 'bg-white/60 text-amber-400 hover:bg-white hover:text-amber-500'
                     }`}
                     title={marginLinked ? 'Unlink margin' : 'Link margin'}
                  >
                     {marginLinked ? <Link2 size={10} /> : <Unlink2 size={10} />}
                  </button>
               </div>

               {/* Margin Top */}
               <div className="flex justify-center -mt-1">
                  <SpacingInput value={mt.num} onChange={(v) => handleMarginChange('Top', v)} />
               </div>

               {/* Middle Row with Padding */}
               <div className="flex items-center gap-1 px-1">
                  {/* Margin Left */}
                  <SpacingInput value={ml.num} onChange={(v) => handleMarginChange('Left', v)} />

                  {/* Padding Layer */}
                  <div className="flex-1 bg-gradient-to-br from-emerald-50 to-teal-50 rounded-lg p-1 border border-emerald-200/60">
                     {/* Padding Label */}
                     <div className="flex items-center justify-between px-1.5 py-0.5">
                        <span className="text-[9px] font-semibold text-emerald-600/80 uppercase tracking-wider">Padding</span>
                        <button
                           onClick={handlePaddingLinkToggle}
                           className={`p-0.5 rounded transition-all ${
                              paddingLinked
                                 ? 'bg-emerald-500 text-white shadow-sm'
                                 : 'bg-white/60 text-emerald-400 hover:bg-white hover:text-emerald-500'
                           }`}
                           title={paddingLinked ? 'Unlink padding' : 'Link padding'}
                        >
                           {paddingLinked ? <Link2 size={9} /> : <Unlink2 size={9} />}
                        </button>
                     </div>

                     {/* Padding Top */}
                     <div className="flex justify-center">
                        <SpacingInput value={pt.num} onChange={(v) => handlePaddingChange('Top', v)} />
                     </div>

                     {/* Padding Middle */}
                     <div className="flex items-center justify-between px-0.5">
                        <SpacingInput value={pl.num} onChange={(v) => handlePaddingChange('Left', v)} />

                        {/* Content Box */}
                        <div className="flex-1 mx-1 h-8 bg-white/80 rounded border border-gray-200/80 flex items-center justify-center">
                           <span className="text-[8px] text-gray-400 font-medium">Content</span>
                        </div>

                        <SpacingInput value={pr.num} onChange={(v) => handlePaddingChange('Right', v)} />
                     </div>

                     {/* Padding Bottom */}
                     <div className="flex justify-center">
                        <SpacingInput value={pb.num} onChange={(v) => handlePaddingChange('Bottom', v)} />
                     </div>
                  </div>

                  {/* Margin Right */}
                  <SpacingInput value={mr.num} onChange={(v) => handleMarginChange('Right', v)} />
               </div>

               {/* Margin Bottom */}
               <div className="flex justify-center -mb-0.5">
                  <SpacingInput value={mb.num} onChange={(v) => handleMarginChange('Bottom', v)} />
               </div>
            </div>
         </div>

         {/* Quick Actions */}
         <div className="flex gap-1">
            <button
               onClick={() => {
                  ['marginTop', 'marginRight', 'marginBottom', 'marginLeft'].forEach(p => onUpdateStyle(p, '0px'));
               }}
               className="flex-1 py-1.5 text-[10px] font-medium text-gray-500 bg-gray-50 hover:bg-gray-100 rounded-md transition-colors"
            >
               Reset Margin
            </button>
            <button
               onClick={() => {
                  ['paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft'].forEach(p => onUpdateStyle(p, '0px'));
               }}
               className="flex-1 py-1.5 text-[10px] font-medium text-gray-500 bg-gray-50 hover:bg-gray-100 rounded-md transition-colors"
            >
               Reset Padding
            </button>
         </div>
      </div>
   );
};
