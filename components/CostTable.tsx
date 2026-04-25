import React, { useState, useEffect, useCallback } from 'react';
import { Division as DivisionType, LineItem } from '../types';
import Division from './Division';

export interface ColumnWidths {
  costCode: number;
  service: number;
  description: number;
  critical: number;
  material: number;
  labor: number;
  equipment: number;
  subContract: number;
  ownerAllowance: number;
  total: number;
}

interface CostTableProps {
  divisions: DivisionType[];
  on_change: (divisionId: string, itemId: string, field: keyof LineItem, value: string | number | boolean) => void;
  onAddItem: (divisionId: string) => void;
  onRemoveItem: (divisionId: string, itemId: string) => void;
  onAIQuoteClick: (divisionId: string, itemId: string, name: string) => void;
  isClientView: boolean;
  overheadPercent: number;
}

const CostTable: React.FC<CostTableProps> = ({ divisions, on_change, onAddItem, onRemoveItem, onAIQuoteClick, isClientView, overheadPercent }) => {
  const [columnWidths, setColumnWidths] = useState<ColumnWidths>({
    costCode: 100,
    service: 180,
    description: 350,
    critical: 80,
    material: 110,
    labor: 110,
    equipment: 110,
    subContract: 110,
    ownerAllowance: 80,
    total: 130
  });

  const [resizing, setResizing] = useState<{ col: keyof ColumnWidths; startX: number; startWidth: number } | null>(null);

  const handleResizeStart = useCallback((col: keyof ColumnWidths, e: React.MouseEvent | React.TouchEvent) => {
    const clientX = 'touches' in e ? (e as React.TouchEvent).touches[0].clientX : (e as React.MouseEvent).clientX;
    setResizing({
      col,
      startX: clientX,
      startWidth: columnWidths[col]
    });
    
    // Prevent text selection during resize
    document.body.style.userSelect = 'none';
  }, [columnWidths]);

  useEffect(() => {
    const handleMove = (e: MouseEvent | TouchEvent) => {
      if (!resizing) return;
      
      const clientX = 'touches' in e ? (e as TouchEvent).touches[0].clientX : (e as MouseEvent).clientX;
      const delta = clientX - resizing.startX;
      const newWidth = Math.max(50, resizing.startWidth + delta);
      
      setColumnWidths(prev => ({
        ...prev,
        [resizing.col]: newWidth
      }));
    };

    const handleEnd = () => {
      setResizing(null);
      document.body.style.userSelect = '';
    };

    if (resizing) {
      window.addEventListener('mousemove', handleMove);
      window.addEventListener('mouseup', handleEnd);
      window.addEventListener('touchmove', handleMove, { passive: false });
      window.addEventListener('touchend', handleEnd);
    }

    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleEnd);
      window.removeEventListener('touchmove', handleMove);
      window.removeEventListener('touchend', handleEnd);
    };
  }, [resizing]);

  return (
    <div className="space-y-4">
      <div className="flex justify-end mb-2">
        <button 
          onClick={() => setColumnWidths({
            costCode: 100,
            service: 180,
            description: 350,
            critical: 80,
            material: 110,
            labor: 110,
            equipment: 110,
            subContract: 110,
            ownerAllowance: 80,
            total: 130
          })}
          className="text-xs text-gray-500 hover:text-indigo-600 underline"
        >
          Reset Column Widths
        </button>
      </div>
      {divisions.map((division, index) => (
        <Division 
          key={division.id} 
          division={division} 
          on_change={on_change}
          onAddItem={onAddItem}
          onRemoveItem={onRemoveItem}
          onAIQuoteClick={onAIQuoteClick}
          isClientView={isClientView}
          defaultOpen={index < 3} // Open first few divisions by default
          overheadPercent={overheadPercent}
          columnWidths={columnWidths}
          onResizeStart={handleResizeStart}
        />
      ))}
    </div>
  );
};

export default CostTable;