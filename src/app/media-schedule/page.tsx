"use client";
import { useEffect, useState } from "react";
import { useRouter } from 'next/navigation';
import type { Site } from '@/lib/types';
import { useSettings } from '@/lib/contexts/SettingsContext';

interface CampaignSite extends Site {
  targetAreaId: string | null;
  targetAreaName: string;
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

export default function MediaSchedulePage() {
  const [scenario, setScenario] = useState<Scenario | null>(null);
  const router = useRouter();
  const { siteData } = useSettings();
  const [selectedSiteId, setSelectedSiteId] = useState('');
  const [clientName, setClientName] = useState('');
  const [campaignName, setCampaignName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  useEffect(() => {
    const stored = localStorage.getItem('exportedScenario');
    if (stored) {
      const parsed = JSON.parse(stored);
      setScenario(parsed);
      setClientName(parsed.clientName || '');
      setCampaignName(parsed.campaignName || parsed.name || '');
      setStartDate(parsed.startDate || '');
      setEndDate(parsed.endDate || '');
    }
  }, []);

  useEffect(() => {
    if (!scenario) return;
    const updated = { ...scenario, clientName, campaignName, startDate, endDate };
    setScenario(updated);
    localStorage.setItem('exportedScenario', JSON.stringify(updated));
  }, [clientName, campaignName, startDate, endDate]);

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

  if (!scenario) {
    return (
      <div style={{ padding: '2rem' }}>
        <h1>No scenario found</h1>
        <button onClick={() => router.push('/map')} style={{ marginTop: 16, padding: '8px 16px', background: '#0070f3', color: '#fff', border: 'none', borderRadius: 4, fontWeight: 600, cursor: 'pointer' }}>Back to Planner</button>
      </div>
    );
  }

  // Filter available sites to only those not already in the schedule
  const availableSites = (siteData || []).filter(site => !scenario.sites.some(s => s.id === site.id));

  return (
    <div style={{ padding: '2rem', marginTop: '5rem', maxWidth: 1200, marginLeft: 'auto', marginRight: 'auto' }}>
      {/* Campaign Info Section - horizontal row */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24, alignItems: 'flex-end', marginBottom: 32 }}>
        <div style={{ flex: '1 1 220px', minWidth: 180 }}>
          <label style={{ fontWeight: 600, fontSize: 14, marginBottom: 4, display: 'block' }}>Client Name</label>
          <input type="text" value={clientName} onChange={e => setClientName(e.target.value)} style={{ width: '100%', padding: '8px 12px', border: '1px solid #ccc', borderRadius: 4 }} />
        </div>
        <div style={{ flex: '1 1 220px', minWidth: 180 }}>
          <label style={{ fontWeight: 600, fontSize: 14, marginBottom: 4, display: 'block' }}>Campaign Name</label>
          <input type="text" value={campaignName} onChange={e => setCampaignName(e.target.value)} style={{ width: '100%', padding: '8px 12px', border: '1px solid #ccc', borderRadius: 4 }} />
        </div>
        <div style={{ flex: '1 1 180px', minWidth: 140 }}>
          <label style={{ fontWeight: 600, fontSize: 14, marginBottom: 4, display: 'block' }}>Start Date</label>
          <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} style={{ width: '100%', padding: '8px 12px', border: '1px solid #ccc', borderRadius: 4 }} />
        </div>
        <div style={{ flex: '1 1 180px', minWidth: 140 }}>
          <label style={{ fontWeight: 600, fontSize: 14, marginBottom: 4, display: 'block' }}>End Date</label>
          <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} style={{ width: '100%', padding: '8px 12px', border: '1px solid #ccc', borderRadius: 4 }} />
        </div>
      </div>
      <h1>Media Schedule: {scenario.name}</h1>
      <p>Budget: {scenario.budget !== null ? `£${scenario.budget.toLocaleString()}` : 'No budget set'}</p>
      <h2>Sites</h2>
      {/* Add Site Dropdown */}
      <div style={{ margin: '16px 0', display: 'flex', gap: 8, alignItems: 'center' }}>
        <select value={selectedSiteId} onChange={e => setSelectedSiteId(e.target.value)} style={{ padding: '6px 10px', border: '1px solid #ccc', borderRadius: 4, minWidth: 200 }}>
          <option value="">Add a site...</option>
          {availableSites.map(site => (
            <option key={site.id} value={site.id}>{site.name} ({site.format}) - £{site.cost.toLocaleString()}</option>
          ))}
        </select>
        <button onClick={handleAddSite} disabled={!selectedSiteId} style={{ padding: '6px 16px', background: '#0070f3', color: '#fff', border: 'none', borderRadius: 4, fontWeight: 600, cursor: !selectedSiteId ? 'not-allowed' : 'pointer' }}>Add</button>
      </div>
      {scenario.sites.length === 0 ? (
        <p>No sites in this scenario.</p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 16 }}>
          <thead>
            <tr>
              <th style={{ borderBottom: '1px solid #ccc', textAlign: 'left', padding: 8 }}>Name</th>
              <th style={{ borderBottom: '1px solid #ccc', textAlign: 'left', padding: 8 }}>Format</th>
              <th style={{ borderBottom: '1px solid #ccc', textAlign: 'left', padding: 8 }}>Target Area</th>
              <th style={{ borderBottom: '1px solid #ccc', textAlign: 'left', padding: 8 }}>Cost</th>
              <th style={{ borderBottom: '1px solid #ccc', textAlign: 'left', padding: 8 }}></th>
            </tr>
          </thead>
          <tbody>
            {scenario.sites.map(site => (
              <tr key={site.id}>
                <td style={{ borderBottom: '1px solid #eee', padding: 8 }}>{site.name}</td>
                <td style={{ borderBottom: '1px solid #eee', padding: 8 }}>{site.format}</td>
                <td style={{ borderBottom: '1px solid #eee', padding: 8 }}>{site.targetAreaName}</td>
                <td style={{ borderBottom: '1px solid #eee', padding: 8 }}>£{site.cost.toLocaleString()}</td>
                <td style={{ borderBottom: '1px solid #eee', padding: 8 }}>
                  <button onClick={() => handleRemoveSite(site.id)} style={{ background: 'none', border: 'none', color: '#c00', fontWeight: 700, cursor: 'pointer', fontSize: 18 }} title="Remove">×</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <button onClick={() => router.push('/map')} style={{ marginTop: 32, padding: '8px 16px', background: '#0070f3', color: '#fff', border: 'none', borderRadius: 4, fontWeight: 600, cursor: 'pointer' }}>Back to Planner</button>
    </div>
  );
} 