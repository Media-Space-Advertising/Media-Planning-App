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
  const [scenario, setScenario] = useState<Scenario | null>(null);
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
    const stored = localStorage.getItem('exportedScenario');
    if (stored) {
      const parsed = JSON.parse(stored);
      setScenario(parsed);
      setClientName(parsed.clientName || '');
      setCampaignName(parsed.campaignName || parsed.name || '');
      setStartDate(parsed.startDate || '');
      setEndDate(parsed.endDate || '');
      setBudgetInput(parsed.budget !== null && parsed.budget !== undefined ? parsed.budget.toString() : '');
    }
  }, []);

  useEffect(() => {
    if (!scenario) return;
    const updated = { ...scenario, clientName, campaignName, startDate, endDate, budget: budgetInput ? parseFloat(budgetInput) : null };
    setScenario(updated);
    localStorage.setItem('exportedScenario', JSON.stringify(updated));
  }, [clientName, campaignName, startDate, endDate, budgetInput]);

  const totalCost = scenario?.sites.reduce((total, site) => total + site.cost, 0) ?? 0;
  const remainingBudget = scenario?.budget !== null && scenario?.budget !== undefined ? scenario.budget - totalCost : null;
  const isOverBudget = remainingBudget !== null && remainingBudget < 0;

  // Add site to schedule
  const handleAddSite = () => {
    if (!scenario || !selectedSiteId || !siteData) return;
    const siteToAdd = siteData.find(site => site.id === selectedSiteId);
    if (!siteToAdd) return;
    // Add with default targetAreaName
    const newSite = { ...siteToAdd, targetAreaId: null, targetAreaName: 'Uncategorized' };
    const updatedScenario = { ...scenario, sites: [...scenario.sites, newSite] };
    setScenario(updatedScenario);
    localStorage.setItem('exportedScenario', JSON.stringify(updatedScenario));
    setSelectedSiteId('');
  };

  // Remove site from schedule
  const handleRemoveSite = (siteId: string) => {
    if (!scenario) return;
    const updatedScenario = { ...scenario, sites: scenario.sites.filter(site => site.id !== siteId) };
    setScenario(updatedScenario);
    localStorage.setItem('exportedScenario', JSON.stringify(updatedScenario));
  };

  const handleClearAllSites = () => {
    if (!scenario) return;
    const updatedScenario = { ...scenario, sites: [] };
    setScenario(updatedScenario);
    localStorage.setItem('exportedScenario', JSON.stringify(updatedScenario));
  };

  if (!scenario) {
    return (
      <div style={{ padding: '2rem', background: '#f8f9fa', minHeight: '100vh', paddingTop: '6rem' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', background: '#fff', padding: '2rem', borderRadius: 8, boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
          <h1>No scenario found</h1>
          <button onClick={() => router.push('/map')} style={{ marginTop: 16, padding: '8px 16px', background: '#0070f3', color: '#fff', border: 'none', borderRadius: 4, fontWeight: 600, cursor: 'pointer' }}>Back to Planner</button>
        </div>
      </div>
    );
  }

  // Filter available sites to only those not already in the schedule
  const availableSites = (siteData || []).filter(site => !scenario.sites.some(s => s.id === site.id));

  return (
    <div style={{ background: '#f8f9fa', paddingTop: '8rem', paddingBottom: '4rem', minHeight: '100vh' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 1rem' }}>
        {/* Media Schedule Card (now includes campaign details, budget, and actions) */}
        <div style={{ background: '#fff', padding: '2rem', borderRadius: 8, boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
          {/* Media Schedule Title */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', borderBottom: '1px solid #dee2e6', paddingBottom: '1rem', marginBottom: '1.5rem' }}
            onClick={() => setIsScheduleOpen(!isScheduleOpen)}
          >
            <div>
              <h1 style={{ fontSize: '1.75rem', fontWeight: 700, margin: 0 }}>Media Schedule: {scenario.name}</h1>
            </div>
            <span style={{ fontSize: "1.5rem", transform: isScheduleOpen ? "rotate(0deg)" : "rotate(-90deg)", transition: "transform 0.2s" }}>▼</span>
          </div>

          {isScheduleOpen && (
            <>
              {/* Campaign Details Section */}
              <div style={{ marginBottom: '2rem' }}>
                <h2 style={{ fontSize: '1.2rem', fontWeight: 600, marginBottom: '1rem', color: '#2d3a4a' }}>Campaign Details</h2>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24, alignItems: 'flex-end' }}>
                  <div style={{ flex: '1 1 220px', minWidth: 180 }}>
                    <label style={{ fontWeight: 600, fontSize: 14, marginBottom: 8, display: 'block', color: '#495057' }}>Client Name</label>
                    <input type="text" value={clientName} onChange={e => setClientName(e.target.value)} style={{ width: '100%', padding: '10px 14px', border: '1px solid #ced4da', borderRadius: 4, fontSize: '1rem' }} />
                  </div>
                  <div style={{ flex: '1 1 220px', minWidth: 180 }}>
                    <label style={{ fontWeight: 600, fontSize: 14, marginBottom: 8, display: 'block', color: '#495057' }}>Campaign Name</label>
                    <input type="text" value={campaignName} onChange={e => setCampaignName(e.target.value)} style={{ width: '100%', padding: '10px 14px', border: '1px solid #ced4da', borderRadius: 4, fontSize: '1rem' }} />
                  </div>
                  <div style={{ flex: '1 1 180px', minWidth: 140 }}>
                    <label style={{ fontWeight: 600, fontSize: 14, marginBottom: 8, display: 'block', color: '#495057' }}>Start Date</label>
                    <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} style={{ width: '100%', padding: '8px 12px', border: '1px solid #ced4da', borderRadius: 4, fontSize: '1rem' }} />
                  </div>
                  <div style={{ flex: '1 1 180px', minWidth: 140 }}>
                    <label style={{ fontWeight: 600, fontSize: 14, marginBottom: 8, display: 'block', color: '#495057' }}>End Date</label>
                    <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} style={{ width: '100%', padding: '8px 12px', border: '1px solid #ced4da', borderRadius: 4, fontSize: '1rem' }} />
                  </div>
                </div>
              </div>

              {/* Budget & Schedule Summary Card (now inside accordion) */}
              <div style={{ background: '#f6fafd', border: '1px solid #e3e8ee', borderRadius: 10, boxShadow: '0 2px 8px rgba(0,0,0,0.03)', padding: '1.5rem 2rem', marginBottom: '2rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 32 }}>
                <div style={{ flex: '1 1 220px', minWidth: 180 }}>
                  <label style={{ fontWeight: 600, fontSize: 14, marginBottom: 8, display: 'block', color: '#495057' }}>Budget</label>
                  <input
                    type="number"
                    min="0"
                    value={budgetInput}
                    onChange={e => setBudgetInput(e.target.value)}
                    placeholder="Set budget (£)"
                    style={{ width: '100%', padding: '10px 14px', border: '1px solid #ced4da', borderRadius: 4, fontSize: '1rem', background: '#fff' }}
                  />
                </div>
                <div style={{ flex: '2 1 400px', minWidth: 200, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                  <span style={{ fontWeight: 600, fontSize: 16 }}>Schedule Total: £{totalCost.toLocaleString()}</span>
                  {scenario.budget !== null && remainingBudget !== null && (
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
                  <select value={selectedSiteId} onChange={e => setSelectedSiteId(e.target.value)} style={{ padding: '8px 12px', border: '1px solid #ccc', borderRadius: 4, minWidth: 200, fontSize: '1rem' }}>
                    <option value="">Add a site...</option>
                    {availableSites.map(site => (
                      <option key={site.id} value={site.id}>{site.name} ({site.format}) - £{site.cost.toLocaleString()}</option>
                    ))}
                  </select>
                  <button onClick={handleAddSite} disabled={!selectedSiteId} style={{ padding: '8px 16px', background: '#0070f3', color: '#fff', border: 'none', borderRadius: 4, fontWeight: 600, cursor: !selectedSiteId ? 'not-allowed' : 'pointer', transition: 'background 0.2s' }}>Add</button>
                </div>
                <button
                  onClick={handleClearAllSites}
                  disabled={scenario.sites.length === 0}
                  style={{
                    padding: '8px 16px',
                    background: '#dc3545',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 4,
                    fontWeight: 600,
                    cursor: scenario.sites.length === 0 ? 'not-allowed' : 'pointer',
                    opacity: scenario.sites.length === 0 ? 0.5 : 1,
                    transition: 'background 0.2s'
                  }}
                >
                  Clear All
                </button>
              </div>
              {scenario.sites.length === 0 ? (
                <p style={{ textAlign: 'center', color: '#6c757d', padding: '2rem 0' }}>No sites have been added to this scenario.</p>
              ) : (
                <div style={{ overflowX: 'auto', border: '1px solid #dee2e6', borderRadius: 8 }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
                    <thead style={{ background: '#f1f3f5' }}>
                      <DndContext 
                        sensors={sensors} 
                        collisionDetection={closestCenter} 
                        onDragStart={handleDragStart}
                        onDragEnd={handleDragEnd}
                      >
                        <SortableContext items={columns} strategy={horizontalListSortingStrategy}>
                          <tr>
                            {columns.map(({ id, label }) => (
                              <DraggableHeader key={id} id={id} label={label} />
                            ))}
                            <th style={{ padding: '12px 16px', width: '50px' }}></th>
                          </tr>
                        </SortableContext>
                        <DragOverlay>
                          {activeId ? (
                            <th style={{
                              padding: '12px 16px',
                              background: '#fff',
                              boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                              cursor: 'grabbing',
                            }}>
                              {columns.find(col => col.id === activeId)?.label}
                            </th>
                          ) : null}
                        </DragOverlay>
                      </DndContext>
                    </thead>
                    <tbody>
                      {scenario.sites.map((site, index) => (
                        <tr key={site.id} style={{ background: index % 2 !== 0 ? '#f8f9fa' : '#fff' }}>
                          {columns.map(column => (
                            <td key={column.id} style={{ padding: '12px 16px', borderTop: '1px solid #dee2e6', wordWrap: 'break-word', color: '#495057' }}>
                              {column.id === 'cost' ? `£${site.cost.toLocaleString()}` : (site as any)[column.id]}
                            </td>
                          ))}
                          <td style={{ padding: '12px 16px', borderTop: '1px solid #dee2e6' }}>
                            <button onClick={() => handleRemoveSite(site.id)} style={{ background: 'none', border: 'none', color: '#c00', fontWeight: 700, cursor: 'pointer', fontSize: 18, padding: 0 }} title="Remove">×</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </div>
        <button onClick={() => router.push('/map')} style={{ marginTop: 32, padding: '8px 16px', background: '#0070f3', color: '#fff', border: 'none', borderRadius: 4, fontWeight: 600, cursor: 'pointer' }}>Back to Planner</button>
      </div>
    </div>
  );
} 