
import React, { useMemo } from 'react';
import { ProjectInfo, Division } from '../types';
import { Save, Loader2 } from 'lucide-react';

interface SummaryProps {
  projectInfo: ProjectInfo;
  divisions: Division[];
  subTotal: number;
  marginAmount: number;
  grandTotal: number;
  isClientView: boolean;
  onClientViewToggle: () => void;
  onGeneratePdf: (showOverhead: boolean, orientation: 'p' | 'l', showDetailedColumns?: boolean) => void;
  onReviewMissingPrices: () => void;
  onSave: () => void;
  onSaveTemplate: () => void;
  isSaving: boolean;
}

const SummaryRow: React.FC<{label: string, value: number, isBold?: boolean}> = ({label, value, isBold}) => (
    <div className={`flex justify-between items-center py-1 ${isBold ? 'font-bold text-base' : 'text-xs'}`}>
        <span className={isBold ? 'text-gray-800' : 'text-gray-500'}>{label}</span>
        <span className={isBold ? 'text-indigo-600' : 'text-gray-700'}>
            {value.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}
        </span>
    </div>
);

const MetricBox: React.FC<{ label: string; value: number }> = ({ label, value }) => (
    <div className="flex items-center justify-between p-1.5 bg-gray-50 rounded border border-gray-100">
        <span className="text-[9px] uppercase tracking-wider font-bold text-gray-500">{label}</span>
        <span className="text-xs font-bold text-gray-800">{value.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}</span>
    </div>
);


const Summary: React.FC<SummaryProps> = ({ 
  projectInfo, 
  divisions, 
  subTotal, 
  marginAmount, 
  grandTotal, 
  isClientView, 
  onClientViewToggle, 
  onGeneratePdf, 
  onReviewMissingPrices,
  onSave,
  onSaveTemplate,
  isSaving
}) => {
  const [includeOverhead, setIncludeOverhead] = React.useState(true);
  const [orientation, setOrientation] = React.useState<'p' | 'l'>('p');
  const [detailedColumns, setDetailedColumns] = React.useState(false);
  const sqft = projectInfo.squareFeet > 0 ? projectInfo.squareFeet : 1;
  
  // Calculate Sitework portion (Div 31, 32, 33)
  const siteworkTotal = useMemo(() => {
    const siteworkDivs = divisions.filter(d => 
        d.costCode.startsWith('31') || 
        d.costCode.startsWith('32') || 
        d.costCode.startsWith('33')
    );
    
    const baseTotal = siteworkDivs.reduce((acc, div) => {
        return acc + div.items.reduce((sum, item) => sum + (Number(item.material) + Number(item.labor) + Number(item.equipment) + Number(item.subContract)), 0);
    }, 0);

    const withOverhead = baseTotal * (1 + projectInfo.add / 100);
    const withMargin = withOverhead * (1 + projectInfo.margin / 100);
    return withMargin;
  }, [divisions, projectInfo.add, projectInfo.margin]);

  const totalCostPerSqFt = grandTotal / sqft;
  const siteworkCostPerSqFt = siteworkTotal / sqft;
  const buildingOnlyCostPerSqFt = (grandTotal - siteworkTotal) / sqft;
  const costPerRoom = projectInfo.rooms > 0 ? grandTotal / projectInfo.rooms : 0;

  return (
    <footer className="sticky bottom-0 bg-white shadow-[0_-4px_10px_-1px_rgba(0,0,0,0.08)] border-t border-gray-200 py-2 px-3 z-50">
      <div className="container mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-center">
        
        {/* Cost Breakdown Metrics */}
        <div className="grid grid-cols-2 lg:grid-cols-1 gap-1.5 order-2 lg:order-1">
            <MetricBox label="Total Cost / SF" value={totalCostPerSqFt} />
            <MetricBox label="Sitework / SF" value={siteworkCostPerSqFt} />
            <MetricBox label="Building / SF" value={buildingOnlyCostPerSqFt} />
            <MetricBox label="Cost / Room" value={costPerRoom} />
        </div>

        <div className="lg:col-span-1 px-4 md:border-r border-gray-100 order-1 lg:order-2">
          <SummaryRow label="Subtotal" value={subTotal} />
          <SummaryRow label={`Margin (${projectInfo.margin}%)`} value={marginAmount} />
          <div className="border-t my-0.5 border-gray-100"></div>
          <SummaryRow label="Grand Total" value={grandTotal} isBold={true} />
        </div>

        {/* Toggles & Settings */}
        <div className="lg:col-span-1 flex flex-col gap-2 border-r border-gray-100 pr-4 order-3">
          <div className="flex items-center justify-between gap-2">
            <label className="text-[12px] font-medium text-gray-600 truncate">Client View</label>
            <button onClick={onClientViewToggle} className={`${isClientView ? 'bg-indigo-600' : 'bg-gray-200'} relative inline-flex h-6 w-11 items-center rounded-full transition-colors`}>
                <span className={`${isClientView ? 'translate-x-6' : 'translate-x-1'} inline-block h-4 w-4 transform rounded-full bg-white transition-transform`}/>
            </button>
          </div>
          <div className="flex items-center justify-between gap-2">
            <label className="text-[12px] font-medium text-gray-600 truncate">Include Overhead</label>
            <button onClick={() => setIncludeOverhead(!includeOverhead)} className={`${includeOverhead ? 'bg-indigo-600' : 'bg-gray-200'} relative inline-flex h-6 w-11 items-center rounded-full transition-colors`}>
                <span className={`${includeOverhead ? 'translate-x-6' : 'translate-x-1'} inline-block h-4 w-4 transform rounded-full bg-white transition-transform`}/>
            </button>
          </div>
          <div className="flex items-center justify-between gap-2">
            <label className="text-[12px] font-medium text-gray-600 truncate">Detailed Columns</label>
            <button 
              disabled={isClientView}
              onClick={() => setDetailedColumns(!detailedColumns)} 
              className={`${detailedColumns && !isClientView ? 'bg-indigo-600' : 'bg-gray-200'} ${isClientView ? 'opacity-30 cursor-not-allowed' : ''} relative inline-flex h-6 w-11 items-center rounded-full transition-colors`}
            >
                <span className={`${detailedColumns && !isClientView ? 'translate-x-6' : 'translate-x-1'} inline-block h-4 w-4 transform rounded-full bg-white transition-transform`}/>
            </button>
          </div>
          <div className="flex items-center justify-between gap-2">
            <label className="text-[12px] font-medium text-gray-600">PDF Dir</label>
            <div className="flex bg-gray-100 rounded p-1">
              <button 
                onClick={() => setOrientation('p')} 
                className={`px-3 py-1 text-[11px] font-bold rounded transition-all ${orientation === 'p' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-400'}`}
              >
                P
              </button>
              <button 
                onClick={() => setOrientation('l')} 
                className={`px-3 py-1 text-[11px] font-bold rounded transition-all ${orientation === 'l' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-400'}`}
              >
                L
              </button>
            </div>
          </div>
        </div>

        {/* Primary Actions */}
        <div className="lg:col-span-1 flex flex-col gap-2 order-4">
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={onSave}
              disabled={isSaving}
              className={`flex items-center justify-center gap-2 font-bold py-3 px-4 rounded text-xs shadow-sm transition-all active:scale-95 ${
                isSaving 
                  ? 'bg-gray-300 text-white cursor-not-allowed' 
                  : 'bg-green-600 text-white hover:bg-green-700'
              }`}
            >
              {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
              {isSaving ? 'Saving...' : 'Save'}
            </button>

            <button
              onClick={() => onGeneratePdf(includeOverhead, orientation, detailedColumns)}
              className="flex items-center justify-center gap-2 bg-indigo-600 text-white font-bold py-3 px-4 rounded text-xs hover:bg-indigo-700 shadow-sm transition-all active:scale-95"
            >
              PDF
            </button>
          </div>
          
          <button
            onClick={onSaveTemplate}
            className="w-full flex items-center justify-center gap-2 bg-white text-indigo-600 border border-indigo-100 font-bold py-2 px-4 rounded hover:bg-indigo-50 shadow-sm transition-all active:scale-95 text-xs"
          >
            <Save size={14} className="opacity-60" />
            Set Default Template
          </button>

          <button
            onClick={onReviewMissingPrices}
            className="w-full bg-red-50 text-red-600 border border-red-100 font-medium py-2 px-4 rounded hover:bg-red-100 shadow-sm transition-all active:scale-95 text-xs"
          >
            Review Missing Prices
          </button>
        </div>
      </div>
    </footer>
  );
};

export default Summary;
