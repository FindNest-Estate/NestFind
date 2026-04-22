'use client';

import { useState } from 'react';
import { Plus, Trash2, Download, Upload, Loader2, Save, AlertCircle } from 'lucide-react';
import { unitsApi } from '@/lib/developerApi';
import styles from './UnitTableEditor.module.css';

interface UnitRow {
  unit_number: string;
  unit_type: string;
  area_sqft: number;
  price: number;
  facing: string;
  floor: number;
}

export default function UnitTableEditor({ projectId, onComplete }: { projectId: string, onComplete: () => void }) {
  const [rows, setRows] = useState<UnitRow[]>([
    { unit_number: '', unit_type: 'Plot', area_sqft: 1200, price: 0, facing: 'East', floor: 0 }
  ]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const addRow = () => {
    setRows([...rows, { unit_number: '', unit_type: 'Plot', area_sqft: 1200, price: 0, facing: 'East', floor: 0 }]);
  };

  const removeRow = (idx: number) => {
    setRows(rows.filter((_, i) => i !== idx));
  };

  const updateRow = (idx: number, field: keyof UnitRow, value: any) => {
    const newRows = [...rows];
    newRows[idx] = { ...newRows[idx], [field]: value };
    setRows(newRows);
  };

  const handleBulkUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setUploading(true);
    setError('');
    try {
      const res = await unitsApi.bulkUpload(projectId, file);
      if (res.success) {
        onComplete();
      } else {
        setError(res.error || 'Bulk upload failed');
      }
    } catch (err: any) {
      setError(err.message || 'Bulk upload failed');
    } finally {
      setUploading(false);
    }
  };

  const saveAll = async () => {
    setLoading(true);
    setError('');
    try {
      // Create units one by one or in batch if API supports
      for (const row of rows) {
        if (!row.unit_number || !row.price) continue;
        await unitsApi.create({ ...row, project_id: projectId });
      }
      onComplete();
    } catch (err: any) {
      setError(err.message || 'Failed to save units');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.headerInfo}>
          <h3>Unit Inventory</h3>
          <p>Add units manually or bulk upload via CSV.</p>
        </div>
        <div className={styles.actions}>
          <a 
            href={`${process.env.NEXT_PUBLIC_API_URL}/developer/units/bulk-upload/sample`}
            className={styles.btnSecondary}
            download
          >
            <Download size={16} /> Template
          </a>
          <label className={styles.btnSecondary}>
            <Upload size={16} /> {uploading ? 'Uploading...' : 'Bulk Upload'}
            <input type="file" hidden accept=".csv" onChange={handleBulkUpload} disabled={uploading} />
          </label>
        </div>
      </div>

      {error && (
        <div className={styles.errorBox}>
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Unit No</th>
              <th>Type</th>
              <th>Area (Sqft)</th>
              <th>Base Price (₹)</th>
              <th>Facing</th>
              <th>Floor</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, idx) => (
              <tr key={idx}>
                <td>
                  <input 
                    value={row.unit_number} 
                    onChange={e => updateRow(idx, 'unit_number', e.target.value)}
                    placeholder="e.g. 101"
                  />
                </td>
                <td>
                  <select value={row.unit_type} onChange={e => updateRow(idx, 'unit_type', e.target.value)}>
                    <option value="Plot">Plot</option>
                    <option value="Villa">Villa</option>
                    <option value="Flat">Flat</option>
                    <option value="Shop">Shop</option>
                  </select>
                </td>
                <td>
                  <input 
                    type="number" 
                    value={row.area_sqft} 
                    onChange={e => updateRow(idx, 'area_sqft', parseInt(e.target.value))}
                  />
                </td>
                <td>
                  <input 
                    type="number" 
                    value={row.price} 
                    onChange={e => updateRow(idx, 'price', parseInt(e.target.value))}
                    placeholder="Price in ₹"
                  />
                </td>
                <td>
                  <select value={row.facing} onChange={e => updateRow(idx, 'facing', e.target.value)}>
                    <option value="East">East</option>
                    <option value="West">West</option>
                    <option value="North">North</option>
                    <option value="South">South</option>
                    <option value="North-East">North-East</option>
                  </select>
                </td>
                <td>
                  <input 
                    type="number" 
                    value={row.floor} 
                    onChange={e => updateRow(idx, 'floor', parseInt(e.target.value))}
                  />
                </td>
                <td>
                  <button className={styles.deleteBtn} onClick={() => removeRow(idx)}>
                    <Trash2 size={16} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className={styles.footer}>
        <button className={styles.btnSecondary} onClick={addRow}>
          <Plus size={16} /> Add Another Unit
        </button>
        <button className={styles.btnPrimary} onClick={saveAll} disabled={loading || rows.length === 0}>
          {loading ? <Loader2 className={styles.spin} /> : <Save size={16} />} Save Inventory
        </button>
      </div>
    </div>
  );
}
