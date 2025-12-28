import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import ExcelJS from 'exceljs';
import Papa from 'papaparse';
import { DndContext, useDraggable, useDroppable, type DragEndEvent } from '@dnd-kit/core';

// --- Types ---
interface MapperProps {
  onComplete: (mappedData: any[]) => void;
}

interface HeaderColumn {
  id: string;      
  label: string;   
  index: number;   
}

const TARGET_FIELDS = [
  { id: 'poNumber', label: 'PO Number' },
  { id: 'sku', label: 'SKU' },
  { id: 'quantity', label: 'Quantity' },
  { id: 'name', label: 'Ship To Name' },
  { id: 'address', label: 'Address' },
  { id: 'city', label: 'City' },
  { id: 'state', label: 'State' },
  { id: 'zip', label: 'Zip Code' }
];

// --- Components ---

const DraggableSource = ({ id, label }: { id: string, label: string }) => {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({ id });
  const style = transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` } : undefined;

  return (
    <div ref={setNodeRef} style={style} {...listeners} {...attributes} className="source-chip">
      {label}
    </div>
  );
};

const DroppableTarget = ({ id, label, assignedLabel, onRemove }: { id: string, label: string, assignedLabel?: string, onRemove: () => void }) => {
  const { setNodeRef, isOver } = useDroppable({ id });
  
  return (
    <div ref={setNodeRef} className={`target-box ${isOver ? 'over' : ''} ${assignedLabel ? 'filled' : ''}`}>
      <span className="target-label">{label}</span>
      {assignedLabel ? (
        <div className="matched-chip">
          {assignedLabel} 
          <span className="remove-x" onClick={(e) => { e.stopPropagation(); onRemove(); }}>×</span>
        </div>
      ) : (
        <span className="placeholder">Drop Header Here</span>
      )}
    </div>
  );
};

// --- Main Component ---

export const FileMapper: React.FC<MapperProps> = ({ onComplete }) => {
  const [fileData, setFileData] = useState<any[]>([]);
  const [columns, setColumns] = useState<HeaderColumn[]>([]);
  const [mapping, setMapping] = useState<Record<string, number>>({});
  const [step, setStep] = useState<'upload' | 'map'>('upload');

  // --- Logic ---

  const processHeaders = (rawRows: any[], headers: string[]) => {
    const cols = headers.map((h, i) => ({
      id: `col-${i}`,
      label: h || `Column ${i + 1}`,
      index: i
    }));
    
    setColumns(cols);
    setFileData(rawRows);
    setStep('map');
  };

  const parseCsv = (file: File) => {
    Papa.parse(file, {
      header: false,
      skipEmptyLines: true,
      complete: (results) => {
        const rows = results.data as string[][];
        if (rows.length > 0) {
          const headers = rows[0];
          const data = rows.slice(1);
          processHeaders(data, headers);
        }
      }
    });
  };

  const parseExcel = async (file: File) => {
    const buffer = await file.arrayBuffer();
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);
    const worksheet = workbook.getWorksheet(1);
    
    if (!worksheet) return;

    let headerRowIdx = 1;
    const row1 = worksheet.getRow(1);
    const uniqueValues = new Set();
    row1.eachCell(c => uniqueValues.add(c.text));
    
    if (uniqueValues.size <= 1 && worksheet.rowCount > 1) {
      headerRowIdx = 2;
    }

    const headers: string[] = [];
    const headerRow = worksheet.getRow(headerRowIdx);
    
    for (let i = 1; i <= headerRow.actualCellCount; i++) {
        headers.push(headerRow.getCell(i).text || `Column ${i}`);
    }

    const dataRows: any[] = [];
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber <= headerRowIdx) return;
      
      const rowValues: string[] = [];
      for(let i = 1; i <= headers.length; i++) {
        const cell = row.getCell(i);
        rowValues.push(cell.text ? cell.text : (cell.value ? cell.value.toString() : ''));
      }
      dataRows.push(rowValues);
    });

    processHeaders(dataRows, headers);
  };

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file.type.includes('csv') || file.name.endsWith('.csv')) {
      parseCsv(file);
    } else {
      parseExcel(file);
    }
  }, []);

  // --- THE MISSING PART IS HERE ---
  const { getRootProps, getInputProps, isDragActive } = useDropzone({ 
    onDrop, 
    accept: { 
      'text/csv': ['.csv'], 
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'] 
    } 
  });
  // -------------------------------

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id) {
      const sourceCol = columns.find(c => c.id === active.id);
      if (sourceCol) {
        setMapping(prev => ({
          ...prev,
          [over.id as string]: sourceCol.index
        }));
      }
    }
  };

  const handleFinish = () => {
    const transformed = fileData.map(row => {
      const newRow: any = {};
      Object.entries(mapping).forEach(([targetField, sourceIndex]) => {
        newRow[targetField] = row[sourceIndex];
      });
      return newRow;
    });
    onComplete(transformed);
  };

  const removeMapping = (fieldId: string) => {
    setMapping(prev => {
        const next = { ...prev };
        delete next[fieldId];
        return next;
    });
  };

  // --- Render ---

  if (step === 'upload') {
    return (
      <div {...getRootProps()} className={`dropzone ${isDragActive ? 'active' : ''}`}>
        <input {...getInputProps()} />
        <p>Drag 'n' drop a CSV or Excel file here</p>
      </div>
    );
  }

  return (
    <DndContext onDragEnd={handleDragEnd}>
      <div className="mapper-container">
        <h3>Map Your Fields</h3>
        <p className="hint">Drag the headers from your file (Left) to the EDI fields (Right)</p>

        <div className="mapping-area">
          {/* LEFT: Source Headers */}
          <div className="source-column">
            <h4>Your File Headers</h4>
            <div className="chip-container">
              {columns.map(col => (
                <DraggableSource key={col.id} id={col.id} label={col.label} />
              ))}
            </div>
          </div>

          {/* RIGHT: Target Fields */}
          <div className="target-column">
            <h4>EDI Engine Fields</h4>
            <div className="target-list">
              {TARGET_FIELDS.map(field => {
                 const sourceIdx = mapping[field.id];
                 const assignedCol = sourceIdx !== undefined ? columns.find(c => c.index === sourceIdx) : null;
                 
                 return (
                  <DroppableTarget 
                    key={field.id} 
                    id={field.id} 
                    label={field.label} 
                    assignedLabel={assignedCol?.label} 
                    onRemove={() => removeMapping(field.id)}
                  />
                );
              })}
            </div>
          </div>
        </div>

        <div className="mapper-actions">
          <button onClick={() => setStep('upload')} className="secondary-btn">Cancel</button>
          <button onClick={handleFinish} disabled={Object.keys(mapping).length === 0}>
            Process {fileData.length} Rows
          </button>
        </div>
      </div>
    </DndContext>
  );
};