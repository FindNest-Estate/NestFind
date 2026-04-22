'use client';

import { useState, useRef, useEffect } from 'react';
import { 
  Plus, Trash2, Save, MousePointer2, Move, 
  Maximize, CheckCircle2, ChevronRight, Loader2, Info, X
} from 'lucide-react';
import { layoutApi, unitsApi } from '@/lib/developerApi';
import type { DevUnit } from '@/types/developer';
import styles from './LayoutEditor.module.css';

interface Point { x: number; y: number; }
interface Mapping {
    id?: string;
    unit_id: string;
    unit_number?: string;
    x: number; // 0-100 percentage
    y: number; // 0-100 percentage
    width: number; // 0-100 percentage
    height: number; // 0-100 percentage
    shape_type: 'rect' | 'circle';
}

export default function LayoutEditor({ projectId, masterImageUrl }: { projectId: string, masterImageUrl?: string }) {
    const [units, setUnits] = useState<DevUnit[]>([]);
    const [mappings, setMappings] = useState<Mapping[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    
    const [selectedMapping, setSelectedMapping] = useState<number | null>(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [startPoint, setStartPoint] = useState<Point | null>(null);
    const [currentRect, setCurrentRect] = useState<Partial<Mapping> | null>(null);
    
    const containerRef = useRef<HTMLDivElement>(null);
    const imageRef = useRef<HTMLImageElement>(null);

    useEffect(() => {
        loadData();
    }, [projectId]);

    async function loadData() {
        setLoading(true);
        try {
            // Load inventory and existing mappings
            const [uRes, mRes] = await Promise.all([
                unitsApi.list({ project_id: projectId, per_page: 500 }),
                layoutApi.getInventory(projectId)
            ]);
            
            if (uRes.success) setUnits(uRes.data);
            if (mRes.success) setMappings(mRes.data);
        } catch (e) {
            console.error('Failed to load layout data', e);
        } finally {
            setLoading(false);
        }
    }

    const getMousePos = (e: React.MouseEvent): Point => {
        if (!imageRef.current) return { x: 0, y: 0 };
        const rect = imageRef.current.getBoundingClientRect();
        return {
            x: ((e.clientX - rect.left) / rect.width) * 100,
            y: ((e.clientY - rect.top) / rect.height) * 100
        };
    };

    const handleMouseDown = (e: React.MouseEvent) => {
        if (selectedMapping !== null) return; // In edit mode
        const point = getMousePos(e);
        setIsDrawing(true);
        setStartPoint(point);
        setCurrentRect({ x: point.x, y: point.y, width: 0, height: 0, shape_type: 'rect' });
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!isDrawing || !startPoint) return;
        const current = getMousePos(e);
        
        setCurrentRect({
            x: Math.min(startPoint.x, current.x),
            y: Math.min(startPoint.y, current.y),
            width: Math.abs(current.x - startPoint.x),
            height: Math.abs(current.y - startPoint.y),
            shape_type: 'rect'
        });
    };

    const handleMouseUp = () => {
        if (isDrawing && currentRect && (currentRect.width || 0) > 1) {
            setMappings([...mappings, { ...currentRect, unit_id: '' } as Mapping]);
            setSelectedMapping(mappings.length);
        }
        setIsDrawing(false);
        setStartPoint(null);
        setCurrentRect(null);
    };

    async function handleSave() {
        setSaving(true);
        try {
            // Filter out incomplete mappings (no unit_id)
            const validMappings = mappings.filter(m => m.unit_id);
            const res = await layoutApi.saveMappings(projectId, validMappings);
            if (res.success) {
                // Refresh to get DB IDs
                loadData();
            }
        } catch (e) {
            console.error(e);
        } finally {
            setSaving(false);
        }
    }

    const removeMapping = (idx: number) => {
        setMappings(mappings.filter((_, i) => i !== idx));
        setSelectedMapping(null);
    };

    if (!masterImageUrl) {
        return (
            <div className={styles.noImage}>
                <Info size={48} />
                <h3>No Master Plan Image</h3>
                <p>Please upload a master layout plan in the Media step first.</p>
            </div>
        );
    }

    return (
        <div className={styles.editorContainer}>
            <div className={styles.editorToolbar}>
                <div className={styles.toolbarGroup}>
                    <button className={`${styles.toolBtn} ${!isDrawing ? styles.toolBtnActive : ''}`}><MousePointer2 size={16} /> Select</button>
                    <button className={`${styles.toolBtn} ${isDrawing ? styles.toolBtnActive : ''}`}><Plus size={16} /> Add Hotspot</button>
                </div>
                
                <div className={styles.toolbarInfo}>
                    <span>{mappings.length} Units Mapped</span>
                    <button className={styles.btnPrimary} onClick={handleSave} disabled={saving}>
                        {saving ? <Loader2 className={styles.spin} /> : <Save size={16} />} Save Mappings
                    </button>
                </div>
            </div>

            <div className={styles.editorWorkspace}>
                <div className={styles.canvasArea} ref={containerRef}>
                    <div className={styles.canvasWrapper}>
                        <img 
                            ref={imageRef}
                            src={masterImageUrl} 
                            className={styles.masterImage}
                            onMouseDown={handleMouseDown}
                            onMouseMove={handleMouseMove}
                            onMouseUp={handleMouseUp}
                            draggable={false}
                        />

                        {/* Existing Mappings */}
                        {mappings.map((m, i) => {
                            const unit = units.find(u => u.id === m.unit_id);
                            const status = unit?.status || 'AVAILABLE';
                            
                            const statusStyles: Record<string, string> = {
                                AVAILABLE: styles.hotspotAvailable,
                                NEGOTIATION: styles.hotspotNegotiation,
                                BOOKED: styles.hotspotSold,
                                SOLD: styles.hotspotSold,
                                BLOCKED: styles.hotspotBlocked
                            };

                            return (
                                <div 
                                    key={i}
                                    className={`
                                        ${styles.hotspot} 
                                        ${selectedMapping === i ? styles.hotspotSelected : ''} 
                                        ${statusStyles[status] || ''}
                                    `}
                                    style={{
                                        left: `${m.x}%`,
                                        top: `${m.y}%`,
                                        width: `${m.width}%`,
                                        height: `${m.height}%`,
                                    }}
                                    onClick={() => setSelectedMapping(i)}
                                >
                                    <span className={styles.hotspotLabel}>
                                        {m.unit_number || 'Unlinked'}
                                    </span>
                                </div>
                            );
                        })}

                        {/* Current Drawing Rect */}
                        {isDrawing && currentRect && (
                            <div 
                                className={styles.drawingRect}
                                style={{
                                    left: `${currentRect.x}%`,
                                    top: `${currentRect.y}%`,
                                    width: `${currentRect.width}%`,
                                    height: `${currentRect.height}%`,
                                }}
                            />
                        )}
                    </div>
                </div>

                <div className={styles.sidebar}>
                    <h3>Unit Properties</h3>
                    {selectedMapping !== null ? (
                        <div className={styles.editForm}>
                            <div className={styles.formGroup}>
                                <label>Assign Unit</label>
                                <select 
                                    value={mappings[selectedMapping].unit_id}
                                    onChange={(e) => {
                                        const newM = [...mappings];
                                        const unit = units.find(u => u.id === e.target.value);
                                        newM[selectedMapping].unit_id = e.target.value;
                                        newM[selectedMapping].unit_number = unit?.unit_number;
                                        setMappings(newM);
                                    }}
                                >
                                    <option value="">Select a unit...</option>
                                    {units.map(u => (
                                        <option key={u.id} value={u.id}>Unit: {u.unit_number} ({u.unit_type})</option>
                                    ))}
                                </select>
                            </div>

                            <div className={styles.formGroup}>
                                <label>Coordinates</label>
                                <div className={styles.coordGrid}>
                                    <div>X: {Math.round(mappings[selectedMapping].x)}%</div>
                                    <div>Y: {Math.round(mappings[selectedMapping].y)}%</div>
                                    <div>W: {Math.round(mappings[selectedMapping].width)}%</div>
                                    <div>H: {Math.round(mappings[selectedMapping].height)}%</div>
                                </div>
                            </div>

                            <button className={styles.btnDanger} onClick={() => removeMapping(selectedMapping)}>
                                <Trash2 size={16} /> Delete Hotspot
                            </button>
                        </div>
                    ) : (
                        <div className={styles.sidebarEmpty}>
                            <MousePointer2 size={32} />
                            <p>Click on a hotspot to edit or drag to create a new one.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
