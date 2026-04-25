import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Division as DivisionType, LineItem } from '../types';
import { ColumnWidths } from './CostTable';
import { Sparkles, Send } from 'lucide-react';

const AutoResizingTextarea: React.FC<{ 
    value: string; 
    onChange: (val: string) => void; 
    className?: string;
    placeholder?: string;
    minHeight?: string;
}> = ({ value, onChange, className, placeholder, minHeight = "40px" }) => {
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const adjustHeight = () => {
        const textarea = textareaRef.current;
        if (textarea) {
            textarea.style.height = 'auto';
            textarea.style.height = `${textarea.scrollHeight}px`;
        }
    };

    useEffect(() => {
        adjustHeight();
    }, [value]);

    return (
        <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className={`${className} overflow-hidden`}
            style={{ minHeight }}
            rows={1}
        />
    );
};

interface DivisionProps {
  division: DivisionType;
  on_change: (divisionId: string, itemId: string, field: keyof LineItem, value: string | number | boolean) => void;
  onAddItem: (divisionId: string) => void;
  onRemoveItem: (divisionId: string, itemId: string) => void;
  onAIQuoteClick: (divisionId: string, itemId: string, currentName: string) => void;
  isClientView: boolean;
  defaultOpen?: boolean;
  overheadPercent: number;
  columnWidths: ColumnWidths;
  onResizeStart: (col: keyof ColumnWidths, e: React.MouseEvent | React.TouchEvent) => void;
}

const ChevronDownIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
    </svg>
);

const CurrencyInput: React.FC<{ value: number; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void; width: number }> = ({ value, onChange, width }) => (
    <div className="relative" style={{ width: width - 32 }}>
        <span className="absolute inset-y-0 left-0 flex items-center pl-1 pointer-events-none text-gray-500">$</span>
        <input
            type="number"
            min="0"
            value={value === 0 ? '' : value}
            onChange={onChange}
            onFocus={(e) => e.target.select()}
            placeholder="0"
            className="w-full bg-transparent border-none p-1 pl-4 text-gray-900 focus:ring-1 focus:ring-indigo-500 rounded-md"
        />
    </div>
);

const LineItemRow: React.FC<{ 
    item: LineItem; 
    divisionId: string; 
    onChange: DivisionProps['on_change']; 
    onRemove: DivisionProps['onRemoveItem'];
    isClientView: boolean; 
    overheadPercent: number;
    columnWidths: ColumnWidths;
    onAIQuoteClick: DivisionProps['onAIQuoteClick'];
}> = ({ item, divisionId, onChange, onRemove, isClientView, overheadPercent, columnWidths, onAIQuoteClick }) => {
    
    const handleInputChange = (field: keyof LineItem, value: string) => {
        const parsedValue = (field === 'description' || field === 'service' || field === 'costCode') ? value : parseFloat(value) || 0;
        onChange(divisionId, item.id, field, parsedValue);
    };

    const rowTotal = useMemo(() => {
        const baseTotal = item.material + item.labor + item.equipment + item.subContract;
        return baseTotal * (1 + overheadPercent / 100);
    }, [item, overheadPercent]);

    const inputClasses = "w-full bg-transparent border-none p-1 text-gray-900 focus:ring-1 focus:ring-indigo-500 rounded-md";

    return (
        <tr className="bg-white hover:bg-gray-50 border-b border-gray-200 group/row">
            <td className="px-4 py-4 text-sm text-gray-500 relative" style={{ width: columnWidths.costCode }}>
                {!isClientView && (
                    <button 
                        onClick={() => onRemove(divisionId, item.id)}
                        className="absolute -left-2 top-1/2 -translate-y-1/2 text-gray-300 hover:text-red-500 opacity-0 group-hover/row:opacity-100 transition-all p-2 hover:bg-red-50 rounded"
                        title="Remove Line Item"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                    </button>
                )}
                <input type="text" placeholder="00-000" value={item.costCode} onChange={e => handleInputChange('costCode', e.target.value)} className={inputClasses} />
            </td>
            <td className="px-4 py-4 text-sm font-medium text-gray-800" style={{ width: columnWidths.service }}>
                <AutoResizingTextarea 
                    value={item.service} 
                    onChange={val => handleInputChange('service', val)} 
                    className={`${inputClasses} resize-none leading-snug py-2`}
                    minHeight="48px"
                />
            </td>
            <td className="px-4 py-4" style={{ width: columnWidths.description }}>
                <div className="relative group/input">
                    <AutoResizingTextarea 
                        value={item.description} 
                        onChange={val => handleInputChange('description', val)} 
                        className={`${inputClasses} resize-none leading-snug py-2 pr-10`}
                        minHeight="48px"
                    />
                    <button
                        onClick={() => onAIQuoteClick(divisionId, item.id, item.service || 'this line item')}
                        className="absolute right-1 bottom-1 p-2 text-indigo-400 hover:text-indigo-600 hover:bg-indigo-50 rounded opacity-0 group-hover/input:opacity-100 transition-all shadow-sm bg-white"
                        title="Fill from Quote with AI"
                    >
                        <Sparkles size={16} />
                    </button>
                </div>
            </td>
            <td className="px-4 py-4 text-center" style={{ width: columnWidths.critical }}>
                <button 
                    onClick={() => onChange(divisionId, item.id, 'isCritical', !item.isCritical)}
                    className={`p-2 rounded-full transition-colors ${item.isCritical ? 'text-red-600 bg-red-100 hover:bg-red-200' : 'text-gray-300 hover:text-gray-400 hover:bg-gray-100'}`}
                    title={item.isCritical ? "Marked as Critical" : "Mark as Critical"}
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                </button>
            </td>
            <td className="px-4 py-4 text-center" style={{ width: columnWidths.ownerAllowance }}>
                <div className="flex justify-center items-center h-full">
                    <input 
                        type="checkbox" 
                        checked={item.ownerAllowance || false} 
                        onChange={e => onChange(divisionId, item.id, 'ownerAllowance', e.target.checked)}
                        className="h-6 w-6 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded cursor-pointer"
                        title="Mark as Owner Allowance"
                    />
                </div>
            </td>
            {!isClientView && (
                <>
                    <td className="px-4 py-4" style={{ width: columnWidths.material }}><CurrencyInput value={item.material} onChange={e => handleInputChange('material', e.target.value)} width={columnWidths.material} /></td>
                    <td className="px-4 py-4" style={{ width: columnWidths.labor }}><CurrencyInput value={item.labor} onChange={e => handleInputChange('labor', e.target.value)} width={columnWidths.labor} /></td>
                    <td className="px-4 py-4" style={{ width: columnWidths.equipment }}><CurrencyInput value={item.equipment} onChange={e => handleInputChange('equipment', e.target.value)} width={columnWidths.equipment} /></td>
                    <td className="px-4 py-4" style={{ width: columnWidths.subContract }}><CurrencyInput value={item.subContract} onChange={e => handleInputChange('subContract', e.target.value)} width={columnWidths.subContract} /></td>
                </>
            )}
            <td className="px-4 py-4 text-right font-semibold text-gray-900" style={{ width: columnWidths.total }}>{rowTotal.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}</td>
        </tr>
    );
};


const Division: React.FC<DivisionProps> = ({ division, on_change, onAddItem, onRemoveItem, onAIQuoteClick, isClientView, defaultOpen = false, overheadPercent, columnWidths, onResizeStart }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  const divisionTotal = useMemo(() => {
    return division.items.reduce((acc, item) => {
        const baseTotal = item.material + item.labor + item.equipment + item.subContract;
        const totalWithOverhead = baseTotal * (1 + overheadPercent / 100);
        return acc + totalWithOverhead;
    }, 0);
  }, [division.items, overheadPercent]);

  const renderHeader = (label: string, col: keyof ColumnWidths, align: 'left' | 'center' | 'right' = 'left') => (
    <th 
      className={`px-4 py-2 font-semibold relative group ${align === 'center' ? 'text-center' : align === 'right' ? 'text-right' : 'text-left'}`}
      style={{ width: columnWidths[col], minWidth: 50 }}
    >
      {label}
      <div 
        onMouseDown={(e) => onResizeStart(col, e)}
        onTouchStart={(e) => onResizeStart(col, e)}
        className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-indigo-400 active:bg-indigo-600 transition-colors z-10"
      />
    </th>
  );

  return (
    <div className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex justify-between items-center p-4 bg-gray-50 hover:bg-gray-100 transition-colors"
      >
        <div className="flex items-center space-x-4">
            <span className="font-mono text-sm text-indigo-600 bg-indigo-100 px-2 py-1 rounded">{division.costCode}</span>
            <h3 className="font-bold text-lg text-gray-800">{division.title}</h3>
        </div>
        <div className="flex items-center space-x-4">
            <span className="font-semibold text-lg text-gray-900">{divisionTotal.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}</span>
            <ChevronDownIcon />
        </div>
      </button>
      
      {isOpen && (
        <div className="overflow-x-auto">
          <table className="w-full text-left table-fixed" style={{ minWidth: Object.values(columnWidths).reduce((a, b) => a + b, 0) }}>
            <thead className="bg-gray-100 text-xs uppercase text-gray-600">
              <tr>
                {renderHeader('Cost Code', 'costCode')}
                {renderHeader('Service', 'service')}
                {renderHeader('Description', 'description')}
                {renderHeader('Critical?', 'critical', 'center')}
                {renderHeader('Allowance', 'ownerAllowance', 'center')}
                {!isClientView && (
                    <>
                        {renderHeader('Material', 'material')}
                        {renderHeader('Labor', 'labor')}
                        {renderHeader('Equipment', 'equipment')}
                        {renderHeader('Sub-Contract', 'subContract')}
                    </>
                )}
                {renderHeader('Total', 'total', 'right')}
              </tr>
            </thead>
            <tbody>
              {division.items.map(item => (
                <LineItemRow 
                    key={item.id} 
                    item={item} 
                    divisionId={division.id} 
                    onChange={on_change} 
                    onRemove={onRemoveItem}
                    isClientView={isClientView} 
                    overheadPercent={overheadPercent}
                    columnWidths={columnWidths}
                    onAIQuoteClick={onAIQuoteClick}
                />
              ))}
            </tbody>
            <tfoot>
                <tr>
                    <td colSpan={isClientView ? 6 : 10} className="p-4 bg-gray-50/30">
                        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                            <button 
                                onClick={() => onAddItem(division.id)} 
                                className="text-indigo-600 hover:text-indigo-800 font-semibold text-sm px-4 py-3 rounded-lg hover:bg-indigo-50 transition-all flex items-center gap-2 border border-transparent hover:border-indigo-100"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                </svg>
                                Add Line Item
                            </button>

                            <div className="flex-1 w-full max-w-md group">
                                <form 
                                    onSubmit={(e) => {
                                        e.preventDefault();
                                        const form = e.target as HTMLFormElement;
                                        const input = form.elements.namedItem('aiPrompt') as HTMLInputElement;
                                        if (input.value.trim()) {
                                            // Trigger AI generation (state handled in App.tsx)
                                            (window as any).triggerAIDivisionItems(division.id, input.value);
                                            input.value = '';
                                        }
                                    }}
                                    className="relative flex items-center"
                                >
                                    <input 
                                        name="aiPrompt"
                                        type="text" 
                                        placeholder={`Ask AI to add items to ${division.title}...`}
                                        className="w-full pl-8 pr-10 py-1.5 bg-white border border-gray-200 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                                    />
                                    <Sparkles className="absolute left-2.5 text-indigo-400" size={14} />
                                    <button 
                                        type="submit"
                                        className="absolute right-1 text-gray-400 hover:text-indigo-600 p-1 rounded transition-colors"
                                        title="Generate Items"
                                    >
                                        <Send size={14} />
                                    </button>
                                </form>
                                <p className="text-[10px] text-gray-400 mt-1 pl-1 opacity-0 group-focus-within:opacity-100 transition-opacity">
                                    Try: "Add common items for electrical rough-in" or "List fixtures for a generic kitchen"
                                </p>
                            </div>
                        </div>
                    </td>
                </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
};

export default Division;