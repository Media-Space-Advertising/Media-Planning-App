"use client";
import { useEffect, useState } from "react";
import { useRouter } from 'next/navigation';
import type { Site } from '@/lib/types';
import { useSettings } from '@/lib/contexts/SettingsContext';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  horizontalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Pencil } from 'lucide-react';

interface CampaignSite extends Site {
  targetAreaId: string | null;
  targetAreaName: string;
  endDate?: string;
}

interface Scenario {
  id: string;
  name: string;
  budget: number | null;
  sites: CampaignSite[];
  clientName?: string;
  campaignName?: string;
  startDate?: string;
  endDate?: string;
}

const initialColumns = [
  { id: 'mediaOwner', label: 'Media Owner' },
  { id: 'format', label: 'Format' },
  { id: 'name', label: 'Name' },
  { id: 'targetAreaName', label: 'Target Area' },
  { id: 'postcode', label: 'Postcode' },
  { id: 'frameId', label: 'Frame ID' },
  { id: 'cost', label: 'Cost' },
];

const DraggableHeader = ({ id, label }: { id: string, label: string }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    padding: '12px 16px',
    cursor: 'grab',
    userSelect: 'none' as const,
  };

  return (
    <th ref={setNodeRef} style={style} {...attributes} {...listeners}>
      {label}
    </th>
  );
};

export default function MediaSchedulePage() {
  const [schedules, setSchedules] = useState<Scenario[]>([]);
  const [activeScheduleId, setActiveScheduleId] = useState<string | null>(null);
  const router = useRouter();
  const { siteData } = useSettings();
  const [selectedSiteId, setSelectedSiteId] = useState('');
  const [clientName, setClientName] = useState('');
  const [campaignName, setCampaignName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [budgetInput, setBudgetInput] = useState('');
  const [columns, setColumns] = useState(initialColumns);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [isScheduleOpen, setIsScheduleOpen] = useState(true);
  const [newScheduleName, setNewScheduleName] = useState('');
  const [isAccordionOpen, setIsAccordionOpen] = useState<{ [id: string]: boolean }>({});
  const [editingScheduleId, setEditingScheduleId] = useState<string | null>(null);
  const [editingScheduleName, setEditingScheduleName] = useState('');

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (active.id !== over?.id) {
      setColumns((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over?.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
    setActiveId(null);
  };

  useEffect(() => {
    // Try to load new format first
    const storedSchedules = localStorage.getItem('mediaSchedules');
    const storedActiveId = localStorage.getItem('activeScheduleId');
    if (storedSchedules) {
      const parsed = JSON.parse(storedSchedules);
      setSchedules(parsed);
      setActiveScheduleId(storedActiveId || (parsed[0]?.id ?? null));
      return;
    }
    // Migrate from old single scenario if present
    const old = localStorage.getItem('exportedScenario');
    if (old) {
      const parsed = JSON.parse(old);
      const migrated = [{ ...parsed, id: 'initial' }];
      setSchedules(migrated);
      setActiveScheduleId('initial');
      localStorage.setItem('mediaSchedules', JSON.stringify(migrated));
      localStorage.setItem('activeScheduleId', 'initial');
      localStorage.removeItem('exportedScenario');
      return;
    }
    // If nothing, start with a blank schedule
    const blank = [{ id: 'initial', name: 'Schedule A', budget: null, sites: [], clientName: '', campaignName: '', startDate: '', endDate: '' }];
    setSchedules(blank);
    setActiveScheduleId('initial');
    localStorage.setItem('mediaSchedules', JSON.stringify(blank));
    localStorage.setItem('activeScheduleId', 'initial');
  }, []);

  useEffect(() => {
    localStorage.setItem('mediaSchedules', JSON.stringify(schedules));
    if (activeScheduleId) localStorage.setItem('activeScheduleId', activeScheduleId);
  }, [schedules, activeScheduleId]);

  const activeSchedule = schedules.find(scenario => scenario.id === activeScheduleId) ?? null;
  const totalCost = activeSchedule?.sites.reduce((total, site) => total + site.cost, 0) ?? 0;
  const remainingBudget = activeSchedule?.budget !== null && activeSchedule?.budget !== undefined ? activeSchedule.budget - totalCost : null;
  const isOverBudget = remainingBudget !== null && remainingBudget < 0;

  // Add site to schedule
  const handleAddSite = () => {
    if (!schedules.find(scenario => scenario.id === activeScheduleId) || !selectedSiteId || !siteData) return;
    const siteToAdd = siteData.find(site => site.id === selectedSiteId);
    if (!siteToAdd) return;
    // Add with default targetAreaName
    const newSite = { ...siteToAdd, targetAreaId: null, targetAreaName: 'Uncategorized' };
    const updatedScenario = { ...schedules.find(scenario => scenario.id === activeScheduleId)!, sites: [...schedules.find(scenario => scenario.id === activeScheduleId)!.sites, newSite] };
    setSchedules(prevSchedules => prevSchedules.map(scenario => scenario.id === activeScheduleId ? updatedScenario : scenario));
    localStorage.setItem('mediaSchedules', JSON.stringify(schedules));
    setSelectedSiteId('');
  };

  // Remove site from schedule
  const handleRemoveSite = (siteId: string) => {
    if (!schedules.find(scenario => scenario.id === activeScheduleId)) return;
    const updatedScenario = { ...schedules.find(scenario => scenario.id === activeScheduleId)!, sites: schedules.find(scenario => scenario.id === activeScheduleId)!.sites.filter(site => site.id !== siteId) };
    setSchedules(prevSchedules => prevSchedules.map(scenario => scenario.id === activeScheduleId ? updatedScenario : scenario));
    localStorage.setItem('mediaSchedules', JSON.stringify(schedules));
  };

  const handleClearAllSites = () => {
    if (!schedules.find(scenario => scenario.id === activeScheduleId)) return;
    const updatedScenario = { ...schedules.find(scenario => scenario.id === activeScheduleId)!, sites: [] };
    setSchedules(prevSchedules => prevSchedules.map(scenario => scenario.id === activeScheduleId ? updatedScenario : scenario));
    localStorage.setItem('mediaSchedules', JSON.stringify(schedules));
  };

  // Add new schedule handler
  const handleAddSchedule = () => {
    const name = newScheduleName.trim() || `Schedule ${schedules.length + 1}`;
    const id = Date.now().toString();
    const newSchedule = { id, name, budget: null, sites: [], clientName: '', campaignName: '', startDate: '', endDate: '' };
    setSchedules(prev => [...prev, newSchedule]);
    setActiveScheduleId(id);
    setIsAccordionOpen(prev => ({ ...prev, [id]: true }));
    setNewScheduleName('');
  };

  // Accordion toggle handler
  const handleAccordionToggle = (id: string) => {
    setActiveScheduleId(id);
    setIsAccordionOpen(prev => ({ ...Object.keys(prev).reduce((acc, key) => ({ ...acc, [key]: false }), {}), [id]: !prev[id] }));
  };

  if (!activeSchedule) {
    return (
      <div style={{ padding: '2rem', background: '#f8f9fa', minHeight: '100vh', paddingTop: '6rem' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', background: '#fff', padding: '2rem', borderRadius: 8, boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
          <h1>No schedule found</h1>
          <button onClick={() => router.push('/map')} style={{ marginTop: 16, padding: '8px 16px', background: '#0070f3', color: '#fff', border: 'none', borderRadius: 4, fontWeight: 600, cursor: 'pointer' }}>Back to Planner</button>
        </div>
      </div>
    );
  }

  // Filter available sites to only those not already in the schedule
  const availableSites = (siteData || []).filter(site => !activeSchedule?.sites.some(s => s.id === site.id));

  return (
    <div style={{ background: '#f8f9fa', paddingTop: '8rem', paddingBottom: '4rem', minHeight: '100vh' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 1rem' }}>
        {/* Add New Schedule UI */}
        <div style={{ marginBottom: '2rem', display: 'flex', gap: 12, alignItems: 'center' }}>
          <input
            type="text"
            value={newScheduleName}
            onChange={e => setNewScheduleName(e.target.value)}
            placeholder="New schedule name"
            style={{ padding: '8px 12px', border: '1px solid #ccc', borderRadius: 4, fontSize: '1rem', minWidth: 200 }}
          />
          <button
            onClick={handleAddSchedule}
            disabled={!newScheduleName.trim()}
            style={{ padding: '8px 16px', background: '#0070f3', color: '#fff', border: 'none', borderRadius: 4, fontWeight: 600, cursor: newScheduleName.trim() ? 'pointer' : 'not-allowed' }}
          >
            Add New Schedule
          </button>
        </div>
        {/* Render all schedules as accordions */}
        {schedules.map(schedule => {
          const open = isAccordionOpen[schedule.id] || (activeScheduleId === schedule.id && Object.keys(isAccordionOpen).length === 0);
          const totalCost = schedule.sites.reduce((total, site) => total + site.cost, 0);
          const remainingBudget = schedule.budget !== null && schedule.budget !== undefined ? schedule.budget - totalCost : null;
          const isOverBudget = remainingBudget !== null && remainingBudget < 0;
          const availableSites = (siteData || []).filter(site => !schedule.sites.some(s => s.id === site.id));
          return (
            <div key={schedule.id} style={{ marginBottom: '2.5rem' }}>
              {/* Accordion header */}
              <div
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', borderBottom: '1px solid #dee2e6', padding: '1.25rem 2rem 1.25rem 1rem', background: open ? '#f6fafd' : '#fff', borderRadius: open ? '10px 10px 0 0' : 10, boxShadow: open ? '0 2px 8px rgba(0,0,0,0.03)' : 'none', fontWeight: 700, fontSize: '1.25rem' }}
                onClick={() => handleAccordionToggle(schedule.id)}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: 8 }} onClick={e => { e.stopPropagation(); }}>
                  {editingScheduleId === schedule.id ? (
                    <input
                      type="text"
                      value={editingScheduleName}
                      autoFocus
                      onChange={e => setEditingScheduleName(e.target.value)}
                      onBlur={() => {
                        setSchedules(prev => prev.map(s => s.id === schedule.id ? { ...s, name: editingScheduleName.trim() || s.name } : s));
                        setEditingScheduleId(null);
                        setEditingScheduleName('');
                      }}
                      onKeyDown={e => {
                        if (e.key === 'Enter') {
                          setSchedules(prev => prev.map(s => s.id === schedule.id ? { ...s, name: editingScheduleName.trim() || s.name } : s));
                          setEditingScheduleId(null);
                          setEditingScheduleName('');
                        } else if (e.key === 'Escape') {
                          setEditingScheduleId(null);
                          setEditingScheduleName('');
                        }
                      }}
                      style={{ fontSize: '1.25rem', fontWeight: 700, border: '1px solid #ccc', borderRadius: 4, padding: '2px 6px', minWidth: 0 }}
                    />
                  ) : (
                    <>
                      <span>Media Schedule: {schedule.name}</span>
                      <button
                        onClick={e => {
                          e.stopPropagation();
                          setEditingScheduleId(schedule.id);
                          setEditingScheduleName(schedule.name);
                        }}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginLeft: 4 }}
                        title="Edit name"
                      >
                        <Pencil size={16} />
                      </button>
                    </>
                  )}
                </span>
                <span style={{ fontSize: '1.5rem', transform: open ? 'rotate(0deg)' : 'rotate(-90deg)', transition: 'transform 0.2s' }}>▼</span>
              </div>
              {/* Accordion content */}
              {open && (
                <div style={{ background: '#fff', borderRadius: '0 0 10px 10px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)', padding: '2rem', borderTop: 'none' }}>
                  {/* Campaign Details Section */}
                  <div style={{ marginBottom: '2rem' }}>
                    <h2 style={{ fontSize: '1.2rem', fontWeight: 600, marginBottom: '1rem', color: '#2d3a4a' }}>Campaign Details</h2>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24, alignItems: 'flex-end' }}>
                      <div style={{ flex: '1 1 220px', minWidth: 180 }}>
                        <label style={{ fontWeight: 600, fontSize: 14, marginBottom: 8, display: 'block', color: '#495057' }}>Client Name</label>
                        <input type="text" value={schedule.clientName ?? ''} onChange={e => setSchedules(prevSchedules => prevSchedules.map(s => s.id === schedule.id ? { ...s, clientName: e.target.value } : s))} style={{ width: '100%', padding: '10px 14px', border: '1px solid #ced4da', borderRadius: 4, fontSize: '1rem' }} />
                      </div>
                      <div style={{ flex: '1 1 220px', minWidth: 180 }}>
                        <label style={{ fontWeight: 600, fontSize: 14, marginBottom: 8, display: 'block', color: '#495057' }}>Campaign Name</label>
                        <input type="text" value={schedule.campaignName ?? ''} onChange={e => setSchedules(prevSchedules => prevSchedules.map(s => s.id === schedule.id ? { ...s, campaignName: e.target.value } : s))} style={{ width: '100%', padding: '10px 14px', border: '1px solid #ced4da', borderRadius: 4, fontSize: '1rem' }} />
                      </div>
                      <div style={{ flex: '1 1 180px', minWidth: 140 }}>
                        <label style={{ fontWeight: 600, fontSize: 14, marginBottom: 8, display: 'block', color: '#495057' }}>Start Date</label>
                        <input type="date" value={schedule.startDate ?? ''} onChange={e => setSchedules(prevSchedules => prevSchedules.map(s => s.id === schedule.id ? { ...s, startDate: e.target.value } : s))} style={{ width: '100%', padding: '8px 12px', border: '1px solid #ced4da', borderRadius: 4, fontSize: '1rem' }} />
                      </div>
                      <div style={{ flex: '1 1 180px', minWidth: 140 }}>
                        <label style={{ fontWeight: 600, fontSize: 14, marginBottom: 8, display: 'block', color: '#495057' }}>End Date</label>
                        <input type="date" value={schedule.endDate ?? ''} onChange={e => setSchedules(prevSchedules => prevSchedules.map(s => s.id === schedule.id ? { ...s, endDate: e.target.value } : s))} style={{ width: '100%', padding: '8px 12px', border: '1px solid #ced4da', borderRadius: 4, fontSize: '1rem' }} />
                      </div>
                    </div>
                  </div>
                  {/* Budget & Schedule Summary Card */}
                  <div style={{ background: '#f6fafd', border: '1px solid #e3e8ee', borderRadius: 10, boxShadow: '0 2px 8px rgba(0,0,0,0.03)', padding: '1.5rem 2rem', marginBottom: '2rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 32 }}>
                    <div style={{ flex: '1 1 220px', minWidth: 180 }}>
                      <label style={{ fontWeight: 600, fontSize: 14, marginBottom: 8, display: 'block', color: '#495057' }}>Budget</label>
                      <input
                        type="number"
                        min="0"
                        value={schedule.budget !== null && schedule.budget !== undefined ? schedule.budget.toString() : '' }
                        onChange={e => setSchedules(prevSchedules => prevSchedules.map(s => s.id === schedule.id ? { ...s, budget: e.target.value ? parseFloat(e.target.value) : null } : s))}
                        placeholder="Set budget (£)"
                        style={{ width: '100%', padding: '10px 14px', border: '1px solid #ced4da', borderRadius: 4, fontSize: '1rem', background: '#fff' }}
                      />
                    </div>
                    <div style={{ flex: '2 1 400px', minWidth: 200, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                      <span style={{ fontWeight: 600, fontSize: 16 }}>Schedule Total: £{totalCost.toLocaleString()}</span>
                      {schedule.budget !== null && remainingBudget !== null && (
                        <span style={{ fontWeight: 600, fontSize: 16, color: isOverBudget ? '#dc3545' : '#28a745' }}>
                          {isOverBudget ? 'Over Budget: ' : 'Remaining: '}
                          {isOverBudget ? '-' : ''}£{Math.abs(remainingBudget).toLocaleString()}
                        </span>
                      )}
                    </div>
                  </div>
                  {/* Sites Section */}
                  <div style={{ margin: '16px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <select value={''} onChange={e => {
                        const siteId = e.target.value;
                        if (!siteId) return;
                        const siteToAdd = siteData?.find(site => site.id === siteId);
                        if (!siteToAdd) return;
                        setSchedules(prevSchedules => prevSchedules.map(s => s.id === schedule.id ? { ...s, sites: [...s.sites, { ...siteToAdd, targetAreaId: null, targetAreaName: 'Uncategorized' }] } : s));
                      }} style={{ padding: '8px 12px', border: '1px solid #ccc', borderRadius: 4, minWidth: 200, fontSize: '1rem' }}>
                        <option value="">Add a site...</option>
                        {availableSites.map(site => (
                          <option key={site.id} value={site.id}>{site.name} ({site.format}) - £{site.cost.toLocaleString()}</option>
                        ))}
                      </select>
                      <button
                        onClick={() => setSchedules(prevSchedules => prevSchedules.map(s => s.id === schedule.id ? { ...s, sites: [] } : s))}
                        disabled={schedule.sites.length === 0}
                        style={{ padding: '8px 16px', background: '#dc3545', color: '#fff', border: 'none', borderRadius: 4, fontWeight: 600, cursor: schedule.sites.length === 0 ? 'not-allowed' : 'pointer', opacity: schedule.sites.length === 0 ? 0.5 : 1, transition: 'background 0.2s' }}
                      >
                        Clear All
                      </button>
                    </div>
                  </div>
                  {schedule.sites.length === 0 ? (
                    <p style={{ textAlign: 'center', color: '#6c757d', padding: '2rem 0' }}>No sites have been added to this schedule.</p>
                  ) : (
                    <div style={{ overflowX: 'auto', border: '1px solid #dee2e6', borderRadius: 8 }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
                        <thead style={{ background: '#f1f3f5' }}>
                          <tr>
                            {columns.map(({ id, label }) => (
                              <DraggableHeader key={id} id={id} label={label} />
                            ))}
                            <th style={{ padding: '12px 16px', width: '50px' }}></th>
                          </tr>
                        </thead>
                        <tbody>
                          {schedule.sites.map((site, index) => (
                            <tr key={site.id} style={{ background: index % 2 !== 0 ? '#f8f9fa' : '#fff' }}>
                              {columns.map(column => (
                                <td key={column.id} style={{ padding: '12px 16px', borderTop: '1px solid #dee2e6', wordWrap: 'break-word', color: '#495057' }}>
                                  {column.id === 'cost' ? `£${site.cost.toLocaleString()}` : (site as any)[column.id]}
                                </td>
                              ))}
                              <td style={{ padding: '12px 16px', borderTop: '1px solid #dee2e6' }}>
                                <button onClick={() => setSchedules(prevSchedules => prevSchedules.map(s => s.id === schedule.id ? { ...s, sites: s.sites.filter(sit => sit.id !== site.id) } : s))} style={{ background: 'none', border: 'none', color: '#c00', fontWeight: 700, cursor: 'pointer', fontSize: 18, padding: 0 }} title="Remove">×</button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
        <button onClick={() => router.push('/map')} style={{ marginTop: 32, padding: '8px 16px', background: '#0070f3', color: '#fff', border: 'none', borderRadius: 4, fontWeight: 600, cursor: 'pointer' }}>Back to Planner</button>
      </div>
    </div>
  );
} 