"use client";
import { useState, useEffect } from "react";
import dynamic from 'next/dynamic';
import { motion, AnimatePresence } from 'framer-motion';
import { Settings, Pencil } from 'lucide-react';
import { useSettings } from '@/lib/contexts/SettingsContext';
import type { Site, PostcodeTarget } from '@/lib/types';
import { useRouter } from 'next/navigation';

const OOHMap = dynamic(() => import('@/components/OOHMap'), {
  ssr: false,
  loading: () => <div style={{ height: "50vh", width: "50vw", display: 'flex', justifyContent: 'center', alignItems: 'center', background: '#f8f8f8', border: "2px solid #ccc", borderRadius: "12px" }}>Loading map...</div>
});

const radiusMin = 0;
const radiusMax = 2000;
const radiusStep = 50;

interface TargetArea {
    id: string;
    name: string;
    targets: PostcodeTarget[];
}

interface Scenario {
  id: string;
  name: string;
  budget: number | null;
  sites: CampaignSite[];
}

interface CampaignSite extends Site {
  targetAreaId: string | null;
  targetAreaName: string;
}

function isWithinRadius(site: Site, targets: PostcodeTarget[], radius: number) {
  // If there are no targets, the radius filter doesn't apply.
  if (!targets.length) return true;

  // If there are targets but the radius is 0, nothing can be within it.
  if (radius === 0) return false;

  // Haversine formula for distance in meters
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  return targets.some(target => {
    const R = 6371000;
    const dLat = toRad(site.lat - target.lat);
    const dLng = toRad(site.lng - target.lng);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(target.lat)) * Math.cos(toRad(site.lat)) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const d = R * c;
    return d <= radius;
  });
}

export default function MapPage() {
  const [sites, setSites] = useState<Site[]>([]);
  const [sitesLoading, setSitesLoading] = useState(true);
  const [availableFormats, setAvailableFormats] = useState<string[]>([]);
  const [isFormatsExpanded, setIsFormatsExpanded] = useState(true);
  const [isRadiusMode, setIsRadiusMode] = useState(false);
  const [selectedFormats, setSelectedFormats] = useState<string[]>([]);
  
  // Scenarios State
  const [scenarios, setScenarios] = useState<Scenario[]>([{ id: 'initial', name: 'Default Scenario', budget: null, sites: [] }]);
  const [scenariosHistory, setScenariosHistory] = useState<Scenario[][]>([scenarios]);
  const [activeScenarioId, setActiveScenarioId] = useState<string>('initial');
  const [scenarioNameInput, setScenarioNameInput] = useState('');
  const [scenarioBudgetInput, setScenarioBudgetInput] = useState('');

  // State for Target Areas
  const [targetAreas, setTargetAreas] = useState<TargetArea[]>([]);
  const [activeTargetAreaId, setActiveTargetAreaId] = useState<string | null>(null);
  const [targetAreaNameInput, setTargetAreaNameInput] = useState("");
  const [postcodeInputs, setPostcodeInputs] = useState<{ [key: string]: string }>({});

  const [radius, setRadius] = useState(radiusMin);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [openSections, setOpenSections] = useState<{ [key: string]: boolean }>({ formats: true, areas: true });

  // Sidebar visibility state
  const [isLeftSidebarOpen, setIsLeftSidebarOpen] = useState(true);
  const [isRightSidebarOpen, setIsRightSidebarOpen] = useState(true);
  // Scenario Planner accordion state
  const [isScenarioPlannerOpen, setIsScenarioPlannerOpen] = useState(true);

  // Multi-select state
  const [isMultiSelectMode, setIsMultiSelectMode] = useState(false);
  const [multiSelectedSites, setMultiSelectedSites] = useState<Site[]>([]);
  const [isBudgetMode, setIsBudgetMode] = useState(false);

  const { settings, siteData, dataSource } = useSettings();
  const activeScenario = scenarios.find(s => s.id === activeScenarioId);
  const campaignSites = activeScenario?.sites ?? [];

  const totalCost = activeScenario?.sites.reduce((total, site) => total + site.cost, 0) ?? 0;
  const remainingBudget = (activeScenario?.budget ?? null) !== null ? (activeScenario?.budget ?? 0) - totalCost : null;
  const isOverBudget = remainingBudget !== null && remainingBudget < 0;

  const [editingTargetAreaId, setEditingTargetAreaId] = useState<string | null>(null);
  const [editingTargetAreaName, setEditingTargetAreaName] = useState('');
  const [editingScenarioId, setEditingScenarioId] = useState<string | null>(null);
  const [editingScenarioName, setEditingScenarioName] = useState('');

  const router = useRouter();

  useEffect(() => {
    const processSites = (sitesToProcess: Site[]) => {
      setSites(sitesToProcess);
      const uniqueFormats = [...new Set(sitesToProcess.map(site => site.format))].sort();
      setAvailableFormats(uniqueFormats);
      setSelectedFormats(uniqueFormats);
      setSitesLoading(false);
      setError("");
    }

    const fetchSitesFromUrl = async () => {
      if (!settings.sheetUrl) {
        setError("App Script URL is not set. Please set it in the settings page.");
        setSitesLoading(false);
        return;
      }
      try {
        setSitesLoading(true);
        const res = await fetch(settings.sheetUrl);
        const data = await res.json();
        if (data.error) {
          throw new Error(data.error);
        }
        const mappedSites: Site[] = data.map((site: any) => ({
          id: site.frameId,
          name: site.panelName,
          format: site.formatName,
          lat: site.lat,
          lng: site.lng,
          cost: site.cost
        }));
        processSites(mappedSites);
      } catch (e: any) {
        console.error("Failed to fetch site data:", e);
        setError(`Failed to load site data. ${e.message}`);
        setSitesLoading(false);
      }
    };

    if (dataSource === 'csv' && siteData && siteData.length > 0) {
      processSites(siteData);
    } else if (dataSource === 'api' || !dataSource) {
      fetchSitesFromUrl();
    } else {
      setSites([]);
      setSitesLoading(false);
    }
  }, [settings.sheetUrl, siteData, dataSource]);

  // On mount, restore scenarios, activeScenarioId, and history from localStorage
  useEffect(() => {
    const storedScenarios = localStorage.getItem('scenarios');
    const storedActiveScenarioId = localStorage.getItem('activeScenarioId');
    const storedScenariosHistory = localStorage.getItem('scenariosHistory');
    if (storedScenarios) setScenarios(JSON.parse(storedScenarios));
    if (storedActiveScenarioId) setActiveScenarioId(storedActiveScenarioId);
    if (storedScenariosHistory) setScenariosHistory(JSON.parse(storedScenariosHistory));
  }, []);

  // Persist scenarios, activeScenarioId, and history to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('scenarios', JSON.stringify(scenarios));
    localStorage.setItem('activeScenarioId', activeScenarioId);
    localStorage.setItem('scenariosHistory', JSON.stringify(scenariosHistory));
  }, [scenarios, activeScenarioId, scenariosHistory]);

  const updateScenarios = (updater: (prevScenarios: Scenario[]) => Scenario[]) => {
    setScenarios(prevScenarios => {
      const newScenarios = updater(prevScenarios);
       // Add to history for undo functionality
      setScenariosHistory(prevHistory => [...prevHistory, newScenarios]);
      return newScenarios;
    });
  };

  const updateCampaignSites = (updater: (prevSites: CampaignSite[]) => CampaignSite[]) => {
    updateScenarios(prevScenarios =>
      prevScenarios.map(scenario => {
        if (scenario.id === activeScenarioId) {
          const newSites = updater(scenario.sites);
          return { ...scenario, sites: newSites };
        }
        return scenario;
      })
    );
  };

  const handleAddScenario = () => {
    const newName = scenarioNameInput.trim() || `Scenario ${scenarios.length + 1}`;
    const newBudget = scenarioBudgetInput ? parseFloat(scenarioBudgetInput) : null;
    const newScenario: Scenario = {
      id: Date.now().toString(),
      name: newName,
      budget: newBudget,
      sites: []
    };
    updateScenarios(prev => [...prev, newScenario]);
    setScenarioNameInput('');
    setScenarioBudgetInput('');
  };

  const handleRemoveScenario = (scenarioId: string) => {
    updateScenarios(prev => prev.filter(s => s.id !== scenarioId));
    // If the active scenario is deleted, fall back to the first one or none
    if (activeScenarioId === scenarioId) {
      setActiveScenarioId(scenarios.length > 1 ? scenarios[0].id : 'initial');
    }
  };

  const handleSetBudget = () => {
    // This function will now be handled within the scenario
    // It can be removed or adapted if a global budget is ever needed again
  };

  const handleAddTargetArea = () => {
    if (!targetAreaNameInput.trim()) return;
    const newArea: TargetArea = {
      id: Date.now().toString(),
      name: targetAreaNameInput.trim(),
      targets: []
    };
    setTargetAreas(prev => [...prev, newArea]);
    setTargetAreaNameInput(""); // Clear input
  };

  const handleRemoveTargetArea = (areaId: string) => {
    setTargetAreas(prev => prev.filter(area => area.id !== areaId));
    if (activeTargetAreaId === areaId) {
      setActiveTargetAreaId(null); // Deselect if the active area is removed
    }
  };

  const handleAddPostcodeToTargetArea = async (areaId: string) => {
    const postcode = postcodeInputs[areaId]?.trim();
    if (!postcode) return;

    setLoading(true);
    setError("");
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          postcode
        )}`
      );
      const data = await res.json();
      if (data && data.length > 0) {
        const lat = parseFloat(data[0].lat);
        const lng = parseFloat(data[0].lon);
        const newTarget: PostcodeTarget = { postcode, lat, lng };

        setTargetAreas(prev => prev.map(area => 
          area.id === areaId 
            ? { ...area, targets: [...area.targets, newTarget] }
            : area
        ));
        setPostcodeInputs(prev => ({...prev, [areaId]: ""})); // Clear input
        setError("");
      } else {
        setError("Postcode not found");
      }
    } catch (e) {
      console.error("Geocoding API error:", e);
      setError("Failed to geocode postcode");
    }
    setLoading(false);
  };

  const handleRemovePostcodeFromTargetArea = (areaId: string, postcodeToRemove: string) => {
    setTargetAreas(prev => prev.map(area => 
      area.id === areaId
        ? { ...area, targets: area.targets.filter(t => t.postcode !== postcodeToRemove) }
        : area
    ));
  };
  
  const handlePostcodeInputChange = (areaId: string, value: string) => {
    setPostcodeInputs(prev => ({ ...prev, [areaId]: value }));
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, areaId: string) => {
    if (e.key === "Enter" && !loading) {
      handleAddPostcodeToTargetArea(areaId);
    }
  };

  const handleAddSiteToCampaign = (siteToAdd: Site) => {
    const activeTargetArea = targetAreas.find(area => area.id === activeTargetAreaId);
    const targetAreaName = activeTargetArea?.name ?? "Uncategorized";
    updateCampaignSites(prev => {
      if (!prev.some(site => site.id === siteToAdd.id)) {
        return [...prev, { ...siteToAdd, targetAreaId: activeTargetAreaId, targetAreaName }];
      }
      return prev;
    });
  };

  const handleAddVisibleSitesToCampaign = () => {
    const activeTargetArea = targetAreas.find(area => area.id === activeTargetAreaId);
    const targetAreaName = activeTargetArea?.name ?? "Uncategorized";
    updateCampaignSites(prev => {
      const newSites = filteredSites
        .filter((fs) => !prev.some((cs) => cs.id === fs.id))
        .map(site => ({ ...site, targetAreaId: activeTargetAreaId, targetAreaName }));
      return [...prev, ...newSites];
    });
  };

  const handleRemoveSiteFromCampaign = (siteIdToRemove: string) => {
    updateCampaignSites(prev => prev.filter(site => site.id !== siteIdToRemove));
  };

  const handleClearCampaign = () => {
    updateCampaignSites(() => []);
  };

  const handleSiteMultiSelect = (siteToToggle: Site) => {
    // Prevent multi-selecting a site that is already in the main campaign
    if (campaignSites.some(cs => cs.id === siteToToggle.id)) return;

    setMultiSelectedSites(prev => 
      prev.some(ms => ms.id === siteToToggle.id)
        ? prev.filter(ms => ms.id !== siteToToggle.id)
        : [...prev, siteToToggle]
    );
  };

  const handleAddSelectedToCampaign = () => {
    const activeTargetArea = targetAreas.find(area => area.id === activeTargetAreaId);
    const targetAreaName = activeTargetArea?.name ?? "Uncategorized";
    updateCampaignSites(prev => {
      const newSites = multiSelectedSites
        .filter((ms) => !prev.some((cs) => cs.id === ms.id))
        .map(site => ({ ...site, targetAreaId: activeTargetAreaId, targetAreaName }));
      return [...prev, ...newSites];
    });

    setMultiSelectedSites([]); // Clear selection after adding
    setIsMultiSelectMode(false); // Optional: exit multi-select mode after adding
  };

  const handleFormatChange = (format: string) => {
    // Selecting/deselecting formats no longer automatically turns off Radius Mode
    setSelectedFormats((prev) =>
      prev.includes(format)
        ? prev.filter((f) => f !== format)
        : [...prev, format]
    );
  };

  const activeTargetArea = targetAreas.find(area => area.id === activeTargetAreaId);
  const targetsForMap = activeTargetArea?.targets ?? [];

  // Filter sites by selected formats, radius, and budget
  const filteredSites = sites.filter(site => {
    // A site must always have its format selected to be shown.
    const formatIsSelected = selectedFormats.includes(site.format);
    if (!formatIsSelected) {
      return false;
    }

    // If Budget Mode is on and a budget is set, check if the site is affordable.
    if (isBudgetMode && remainingBudget !== null && site.cost > remainingBudget) {
      return false;
    }

    // If Radius Mode is on, the site must ALSO be within the radius.
    if (isRadiusMode) {
      return isWithinRadius(site, targetsForMap, radius);
    }

    // If we're not in any special mode, just having the format selected is enough.
    return true;
  });

  const groupedSites = campaignSites.reduce((acc, site) => {
    const key = site.targetAreaName;
    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push(site);
    return acc;
  }, {} as Record<string, CampaignSite[]>);

  const toggleSection = (section: 'formats' | 'areas' | string) => {
    setOpenSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const handleUndo = () => {
    setScenariosHistory(prevHistory => {
      if (prevHistory.length <= 1) return prevHistory;
      const newHistory = prevHistory.slice(0, -1);
      const previousScenarios = newHistory[newHistory.length - 1];
      setScenarios(previousScenarios);
      return newHistory;
    });
  };

  const toggleButtonStyle: React.CSSProperties = {
    position: 'absolute',
    top: '50%',
    transform: 'translateY(-50%)',
    height: '70px',
    width: '24px',
    background: 'rgba(0, 112, 243, 0.8)',
    color: 'white',
    border: 'none',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 401,
    fontSize: '18px',
    fontWeight: 'bold',
    transition: 'left 0.3s ease-in-out, right 0.3s ease-in-out, background 0.2s',
    backdropFilter: 'blur(2px)'
  };

  const handleEditTargetArea = (area: TargetArea) => {
    setEditingTargetAreaId(area.id);
    setEditingTargetAreaName(area.name);
  };

  const handleSaveTargetAreaName = (areaId: string) => {
    setTargetAreas(prev => prev.map(area => area.id === areaId ? { ...area, name: editingTargetAreaName.trim() || area.name } : area));
    setEditingTargetAreaId(null);
    setEditingTargetAreaName('');
  };

  const handleEditScenario = (scenario: Scenario) => {
    setEditingScenarioId(scenario.id);
    setEditingScenarioName(scenario.name);
  };

  const handleSaveScenarioName = (scenarioId: string) => {
    updateScenarios(prev => prev.map(s => s.id === scenarioId ? { ...s, name: editingScenarioName.trim() || s.name } : s));
    setEditingScenarioId(null);
    setEditingScenarioName('');
  };

  const handleExportToMediaSchedule = () => {
    if (!activeScenario) return;
    // Store the scenario in localStorage for retrieval on the Media Schedule page
    localStorage.setItem('exportedScenario', JSON.stringify(activeScenario));
    router.push('/media-schedule');
  };

  return (
    <div style={{position: 'relative', height: '100vh', paddingTop: '4rem', boxSizing: 'border-box', background: "#f7f7f9", overflow: 'hidden'}}>

      {/* Map Area - now the base layer */}
      <main style={{
        position: 'absolute',
        top: '4rem',
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 1
      }}>
        <div style={{ width: "100%", height: "100%" }}>
          {sitesLoading ? (
            <div>Loading sites...</div>
          ) : (
            <OOHMap
              targets={targetsForMap}
              radius={radius}
              sites={filteredSites}
              onSiteSelect={handleAddSiteToCampaign}
              campaignSites={campaignSites}
              isMultiSelectMode={isMultiSelectMode}
              multiSelectedSites={multiSelectedSites}
              onSiteMultiSelect={handleSiteMultiSelect}
            />
          )}
        </div>
      </main>

      {/* Left Sidebar - now an overlay */}
      <aside style={{ 
        position: 'absolute',
        top: '4rem',
        bottom: 0,
        left: 0,
        width: '380px',
        zIndex: 10,
        transform: `translateX(${isLeftSidebarOpen ? '0%' : '-100%'})`,
        transition: 'transform 0.3s ease-in-out',
        padding: "1rem 1rem 2rem 2rem", 
        background: "#fff", 
        borderRight: "1px solid #eee", 
        display: "flex", 
        flexDirection: "column", 
        gap: "0.5rem", 
        overflowY: 'auto'
      }}>
        {/* Accordion Section: Format Selection */}
        <div style={{ border: '1px solid #ddd', borderRadius: 8 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer", padding: '12px' }} onClick={() => toggleSection('formats')}>
            <h2 style={{ fontSize: "1.1rem", fontWeight: 600, margin: 0 }}>Format Selection</h2>
            <span style={{ fontSize: "1.2rem", transform: openSections.formats ? "rotate(0deg)" : "rotate(-90deg)", transition: "transform 0.2s" }}>▼</span>
          </div>
          {openSections.formats && (
            <div style={{ padding: '0 12px 12px 12px' }}>
              <div style={{ border: "1px solid #e5e7eb", borderRadius: 8, padding: "14px 12px", background: "#f9f9f9" }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                  <button
                    type="button"
                    onClick={() => { setSelectedFormats([...availableFormats]); setIsRadiusMode(false); }}
                    style={{ padding: '4px 8px', background: '#e0e0e0', border: '1px solid #ccc', borderRadius: 4, cursor: 'pointer', fontSize: 13 }}
                  >
                    Select All
                  </button>
                  <button
                    type="button"
                    onClick={() => { setSelectedFormats([]); }}
                    style={{ padding: '4px 8px', background: '#e0e0e0', border: '1px solid #ccc', borderRadius: 4, cursor: 'pointer', fontSize: 13 }}
                  >
                    Clear
                  </button>
                </div>
                <div style={{ borderTop: '1px solid #ddd', margin: '12px 0', paddingTop: '12px', display: 'flex', justifyContent: 'center' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: targetsForMap.length === 0 ? 'not-allowed' : 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={isRadiusMode}
                      onChange={(e) => setIsRadiusMode(e.target.checked)}
                      disabled={targetsForMap.length === 0}
                      style={{ width: 15, height: 15 }}
                    />
                    <span style={{ color: targetsForMap.length === 0 ? '#999' : '#000', fontSize: 15 }}>Radius Mode</span>
                  </label>
                </div>
                <div style={{ borderTop: '1px solid #ddd', margin: '12px 0', paddingTop: '12px' }}>
                  <h3 style={{ fontSize: "1rem", fontWeight: 600, marginBottom: 8, textAlign: 'center' }}>Radius (meters)</h3>
                  <input
                    type="range"
                    min={radiusMin}
                    max={radiusMax}
                    step={radiusStep}
                    value={radius}
                    onChange={(e) => setRadius(Number(e.target.value))}
                    style={{ width: "100%", height: '32px', cursor: targetsForMap.length === 0 ? 'not-allowed' : 'pointer', accentColor: '#0070f3' }}
                    disabled={targetsForMap.length === 0}
                  />
                  <div style={{ textAlign: "center", marginTop: 4, fontWeight: 600, fontSize: 16 }}>{radius} m</div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 10, maxHeight: '30vh', overflowY: 'auto', borderTop: '1px solid #ddd', paddingTop: '12px', marginTop: '12px' }}>
                  {availableFormats.map((format) => (
            <label key={format} style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 15 }}>
              <input
                type="checkbox"
                checked={selectedFormats.includes(format)}
                onChange={() => handleFormatChange(format)}
                style={{ marginRight: 8, width: 16, height: 16 }}
              />
              <span>{format}</span>
            </label>
          ))}
        </div>
      </div>
            </div>
          )}
        </div>

        {/* Accordion Section: Target Areas */}
        <div style={{ border: '1px solid #ddd', borderRadius: 8 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer", padding: '12px' }} onClick={() => toggleSection('areas')}>
            <h2 style={{ fontSize: "1.1rem", fontWeight: 600, margin: 0 }}>Target Areas</h2>
            <span style={{ fontSize: "1.2rem", transform: openSections.areas ? "rotate(0deg)" : "rotate(-90deg)", transition: "transform 0.2s" }}>▼</span>
          </div>
          {openSections.areas && (
            <div style={{ padding: '0 12px 12px 12px' }}>
              <div style={{ display: "flex", gap: 4, marginBottom: 16 }}>
                <input
                  type="text"
                  value={targetAreaNameInput}
                  onChange={(e) => setTargetAreaNameInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddTargetArea()}
                  placeholder="New area name"
                  style={{ flex: 1, padding: "6px 10px", border: "1px solid #ccc", borderRadius: 4, minWidth: 0 }}
                />
                <button
                  type="button"
                  style={{ padding: "6px 12px", background: "#0070f3", color: "#fff", border: "none", borderRadius: 4, fontWeight: 600, cursor: "pointer" }}
                  onClick={handleAddTargetArea}
                  disabled={!targetAreaNameInput.trim()}
                >
                  +
                </button>
              </div>

              {error && <div style={{ color: "#c00", marginBottom: 6, fontSize: 14 }}>{error}</div>}

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {targetAreas.map(area => (
                  <div key={area.id} style={{ border: '1px solid #ddd', borderRadius: 8, padding: '12px', background: activeTargetAreaId === area.id ? '#f0f8ff' : '#f9f9f9' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600 }}>
                        {editingTargetAreaId === area.id ? (
                          <input
                            type="text"
                            value={editingTargetAreaName}
                            autoFocus
                            onChange={e => setEditingTargetAreaName(e.target.value)}
                            onBlur={() => handleSaveTargetAreaName(area.id)}
                            onKeyDown={e => { if (e.key === 'Enter') handleSaveTargetAreaName(area.id); }}
                            style={{ fontSize: '1rem', fontWeight: 600, margin: 0, border: '1px solid #ccc', borderRadius: 4, padding: '2px 6px', minWidth: 0 }}
                          />
                        ) : (
                          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            {area.name}
                            <button onClick={() => handleEditTargetArea(area)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginLeft: 4 }} title="Edit name">
                              <Pencil size={14} />
                            </button>
                          </span>
                        )}
                      </h3>
                      <div>
                        <button onClick={() => setActiveTargetAreaId(area.id)} style={{ marginRight: 4, padding: '2px 8px', fontSize: 13, cursor: 'pointer', border: '1px solid #0070f3', background: activeTargetAreaId === area.id ? '#0070f3' : '#fff', color: activeTargetAreaId === area.id ? '#fff' : '#0070f3', borderRadius: 4 }}>View</button>
                        <button onClick={() => handleRemoveTargetArea(area.id)} style={{ padding: '2px 6px', fontSize: 13, cursor: 'pointer', border: '1px solid #c00', background: 'none', color: '#c00', borderRadius: 4 }}>X</button>
                      </div>
                    </div>
        <div style={{ display: "flex", gap: 4, marginBottom: 8 }}>
          <input
            type="text"
                        value={postcodeInputs[area.id] || ""}
                        onChange={(e) => handlePostcodeInputChange(area.id, e.target.value)}
            placeholder="Enter postcode"
            style={{ flex: 1, padding: "6px 10px", border: "1px solid #ccc", borderRadius: 4, minWidth: 0 }}
                        onKeyDown={(e) => handleInputKeyDown(e, area.id)}
            disabled={loading}
          />
          <button
            type="button"
            style={{ padding: "6px 12px", background: loading ? "#aaa" : "#0070f3", color: "#fff", border: "none", borderRadius: 4, fontWeight: 600, cursor: loading ? "not-allowed" : "pointer" }}
                        onClick={() => handleAddPostcodeToTargetArea(area.id)}
                        disabled={loading || !(postcodeInputs[area.id] || "").trim()}
          >
            {loading ? <span style={{ fontSize: 14 }}>...</span> : "+"}
          </button>
        </div>
        <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                      {area.targets.map((t) => (
            <li key={t.postcode} style={{ display: "flex", alignItems: "center", marginBottom: 4, background: "#f3f3f3", borderRadius: 4, padding: "2px 6px" }}>
              <span style={{ flex: 1, fontSize: 14 }}>{t.postcode}</span>
              <button
                            onClick={() => handleRemovePostcodeFromTargetArea(area.id, t.postcode)}
                style={{ marginLeft: 8, background: "none", border: "none", color: "#c00", fontWeight: 700, cursor: "pointer", fontSize: 16 }}
                title="Remove"
              >
                ×
              </button>
            </li>
          ))}
        </ul>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </aside>

      {/* Right Sidebar - now an overlay */}
      <aside style={{ 
        position: 'absolute',
        top: '4rem',
        bottom: 0,
        right: 0,
        width: '380px',
        zIndex: 10,
        transform: `translateX(${isRightSidebarOpen ? '0%' : '100%'})`,
        transition: 'transform 0.3s ease-in-out',
        padding: "1rem 2rem 2rem 1rem", 
        background: "#fff", 
        borderLeft: "1px solid #eee", 
        display: "flex", 
        flexDirection: "column", 
        gap: "1rem", 
        overflowY: 'auto'
      }}>
        <div style={{ border: '1px solid #ddd', borderRadius: 8 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer", padding: '12px' }} onClick={() => setIsScenarioPlannerOpen(open => !open)}>
            <h2 style={{ fontSize: "1.2rem", fontWeight: 600, margin: 0 }}>Scenario Planner</h2>
            <span style={{ fontSize: "1.2rem", transform: isScenarioPlannerOpen ? "rotate(0deg)" : "rotate(-90deg)", transition: "transform 0.2s" }}>▼</span>
          </div>
          {isScenarioPlannerOpen && (
            <div style={{ padding: '0 12px 12px 12px' }}>
              {/* Add New Scenario Form */}
              <div style={{ border: '1px solid #ddd', borderRadius: 8, padding: '14px 12px', background: '#f9f9f9', marginBottom: '1rem' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 600, margin: '0 0 8px 0' }}>Add New Scenario</h3>
                <input
                  type="text"
                  value={scenarioNameInput}
                  onChange={(e) => setScenarioNameInput(e.target.value)}
                  placeholder="Scenario Name"
                  style={{ width: '100%', padding: "6px 10px", border: "1px solid #ccc", borderRadius: 4, marginBottom: '8px', boxSizing: 'border-box' }}
                />
                <input
                  type="number"
                  value={scenarioBudgetInput}
                  onChange={(e) => setScenarioBudgetInput(e.target.value)}
                  placeholder="Budget (optional)"
                  style={{ width: '100%', padding: "6px 10px", border: "1px solid #ccc", borderRadius: 4, marginBottom: '8px', boxSizing: 'border-box' }}
                />
                <button
                  type="button"
                  onClick={handleAddScenario}
                  style={{ width: '100%', padding: "8px 12px", background: "#0070f3", color: "#fff", border: "none", borderRadius: 4, fontWeight: 600, cursor: "pointer" }}
                >
                  Add Scenario
                </button>
              </div>
              {/* Scenarios List */}
              <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {scenarios.map(scenario => {
                  const totalCost = scenario.sites.reduce((total, site) => total + site.cost, 0);
                  const remainingBudget = scenario.budget !== null ? scenario.budget - totalCost : null;
                  const isOverBudget = remainingBudget !== null && remainingBudget < 0;

                  const groupedSites = scenario.sites.reduce((acc, site) => {
                    const key = site.targetAreaName;
                    if (!acc[key]) {
                      acc[key] = [];
                    }
                    acc[key].push(site);
                    return acc;
                  }, {} as Record<string, CampaignSite[]>);

                  const isOpen = openSections[scenario.id] ?? false;

                  return (
                    <div key={scenario.id} style={{ border: '1px solid #ddd', borderRadius: 8, background: activeScenarioId === scenario.id ? '#f0f8ff' : '#fff' }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer", padding: '12px' }} onClick={() => toggleSection(scenario.id)}>
                        <div style={{ fontWeight: 600, flex: 1, display: 'flex', alignItems: 'center', gap: 6 }}>
                          {editingScenarioId === scenario.id ? (
                            <input
                              type="text"
                              value={editingScenarioName}
                              autoFocus
                              onChange={e => setEditingScenarioName(e.target.value)}
                              onBlur={() => handleSaveScenarioName(scenario.id)}
                              onKeyDown={e => { if (e.key === 'Enter') handleSaveScenarioName(scenario.id); }}
                              style={{ fontSize: '1rem', fontWeight: 600, border: '1px solid #ccc', borderRadius: 4, padding: '2px 6px', minWidth: 0 }}
                            />
                          ) : (
                            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              {scenario.name}
                              <button onClick={() => handleEditScenario(scenario)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginLeft: 4 }} title="Edit name">
                                <Pencil size={14} />
                              </button>
                            </span>
                          )}
                        </div>
                        <span style={{ fontSize: "1.2rem", transform: isOpen ? "rotate(0deg)" : "rotate(-90deg)", transition: "transform 0.2s" }}>▼</span>
                      </div>
                      {isOpen && (
                        <div style={{ padding: '0 12px 12px 12px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                             <button onClick={() => setActiveScenarioId(scenario.id)} style={{ padding: '4px 10px', fontSize: 13, cursor: 'pointer', border: '1px solid #0070f3', background: activeScenarioId === scenario.id ? '#0070f3' : '#fff', color: activeScenarioId === scenario.id ? '#fff' : '#0070f3', borderRadius: 4, flex: 1 }}>
                              {activeScenarioId === scenario.id ? 'Active' : 'Set Active'}
                            </button>
                            <button onClick={() => handleRemoveScenario(scenario.id)} style={{ padding: '4px 8px', fontSize: 13, cursor: 'pointer', border: '1px solid #c00', background: 'none', color: '#c00', borderRadius: 4 }} title="Remove Scenario">
                              X
                            </button>
                          </div>

                           {/* General controls inside the active scenario */}
                          {activeScenarioId === scenario.id && (
                            <div style={{ borderTop: '1px solid #eee', paddingTop: '12px' }}>
                              <div style={{ marginBottom: '1rem', borderBottom: '1px solid #eee', paddingBottom: '1rem', display: 'flex', justifyContent: 'center' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '0.75rem' }}>
                                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                                    <input
                                      type="checkbox"
                                      checked={isMultiSelectMode}
                                      onChange={(e) => {
                                        setIsMultiSelectMode(e.target.checked);
                                        if (!e.target.checked) {
                                          setMultiSelectedSites([]);
                                        }
                                      }}
                                      style={{ width: 15, height: 15 }}
                                    />
                                    <span style={{ fontSize: 15 }}>Select Multiple</span>
                                  </label>
                                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: scenario.budget === null ? 'not-allowed' : 'pointer' }}>
                                    <input
                                      type="checkbox"
                                      checked={isBudgetMode}
                                      onChange={(e) => setIsBudgetMode(e.target.checked)}
                                      disabled={scenario.budget === null}
                                      style={{ width: 15, height: 15 }}
                                    />
                                    <span style={{ fontSize: 15, color: scenario.budget === null ? '#999' : '#000' }}>Budget Mode</span>
                                  </label>
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={handleAddVisibleSitesToCampaign}
                                disabled={filteredSites.length === 0}
                                style={{ width: '100%', padding: '8px', background: '#28a745', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer', marginBottom: '1rem', fontSize: 14, fontWeight: 600, opacity: filteredSites.length === 0 ? 0.5 : 1 }}
                              >
                                Add {filteredSites.length} Visible Sites
                              </button>
                              {isMultiSelectMode && (
                                <button
                                  type="button"
                                  onClick={handleAddSelectedToCampaign}
                                  disabled={multiSelectedSites.length === 0}
                                  style={{ width: '100%', padding: '8px', background: '#ff8c00', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer', marginBottom: '1rem', fontSize: 14, fontWeight: 600, opacity: multiSelectedSites.length === 0 ? 0.5 : 1 }}
                                >
                                  Add {multiSelectedSites.length} Selected
                                </button>
                              )}
                              <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
                                 {/* The Undo and Clear buttons now need to be adapted for scenarios */}
                                <button
                                  type="button"
                                  onClick={handleUndo}
                                  disabled={scenariosHistory.length <= 1}
                                  style={{ flex: 1, padding: '8px', background: '#6c757d', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 14, fontWeight: 600, opacity: scenariosHistory.length <= 1 ? 0.5 : 1 }}
                                >
                                  Undo
                                </button>
                                <button
                                  type="button"
                                  onClick={handleClearCampaign}
                                  disabled={scenario.sites.length === 0}
                                  style={{ flex: 1, padding: '8px', background: '#dc3545', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 14, fontWeight: 600, opacity: scenario.sites.length === 0 ? 0.5 : 1 }}
                                >
                                  Clear Plan
                                </button>
                              </div>
                            </div>
                          )}
                          
                          {scenario.sites.length === 0 ? (
                            <p style={{ margin: 0, color: "#666", fontSize: 14, textAlign: 'center', padding: '1rem 0' }}>No sites added to this scenario.</p>
                          ) : (
                            <div style={{ maxHeight: 'calc(100vh - 550px)', overflowY: 'auto' }}>
                              {Object.entries(groupedSites).map(([targetAreaName, sites]) => (
                                <div key={targetAreaName} style={{ marginBottom: '1rem' }}>
                                  <h4 style={{ fontSize: '1rem', fontWeight: 700, margin: '0 0 8px 0', paddingBottom: '4px', borderBottom: '2px solid #eee' }}>{targetAreaName}</h4>
                                  <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                                    {sites.map(site => (
                                      <li key={site.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 14, marginBottom: 8, paddingBottom: 8, borderBottom: '1px solid #f0f0f0' }}>
                                        <span style={{ flex: 1, marginRight: 8 }}>
                                          <strong>{site.name}</strong><br/>
                                          <span style={{ color: '#555', fontSize: '13px' }}>{site.format}</span><br/>
                                          <span style={{ color: '#555' }}>£{site.cost.toLocaleString()}</span>
                                        </span>
                                        <button onClick={() => handleRemoveSiteFromCampaign(site.id)} style={{ background: 'none', border: 'none', color: '#c00', fontWeight: 700, cursor: 'pointer', fontSize: 18 }} title="Remove">×</button>
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              ))}
                            </div>
                          )}
                          <div style={{ borderTop: '1px solid #ccc', paddingTop: 12, marginTop: 12 }}>
                            <p style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, margin: 0, fontSize: 16 }}>
                              <span>Total Cost:</span>
                              <span>£{totalCost.toLocaleString()}</span>
                            </p>
                            {scenario.budget !== null && remainingBudget !== null && (
                              <p style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, margin: '8px 0 0', fontSize: 16, color: isOverBudget ? '#dc3545' : '#28a745' }}>
                                <span>{isOverBudget ? 'Over Budget:' : 'Remaining:'}</span>
                                <span>
                                  {isOverBudget ? '-' : ''}£{Math.abs(remainingBudget).toLocaleString()}
                                </span>
                              </p>
                            )}
                            {/* Export to Media Schedule button - small and at the bottom */}
                            {activeScenarioId === scenario.id && (
                              <div style={{ display: 'flex', justifyContent: 'center', marginTop: 16 }}>
                                <button
                                  type="button"
                                  onClick={handleExportToMediaSchedule}
                                  style={{
                                    padding: '4px 10px',
                                    fontSize: 13,
                                    cursor: 'pointer',
                                    border: '1px solid #0070f3',
                                    background: '#0070f3',
                                    color: '#fff',
                                    borderRadius: 4,
                                    fontWeight: 600,
                                    flex: 1,
                                    minWidth: 0
                                  }}
                                >
                                  Export
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </aside>

      {/* Toggle Buttons - on top of everything */}
      <button
        style={{
          ...toggleButtonStyle,
          left: isLeftSidebarOpen ? '380px' : '0px',
          borderRadius: '0 8px 8px 0',
          background: isLeftSidebarOpen ? '#0070f3' : 'rgba(0, 112, 243, 0.7)'
        }}
        onClick={() => setIsLeftSidebarOpen(!isLeftSidebarOpen)}
        title={isLeftSidebarOpen ? "Collapse Controls" : "Expand Controls"}
      >
        {isLeftSidebarOpen ? '‹' : '›'}
      </button>

      <button
        style={{
          ...toggleButtonStyle,
          right: isRightSidebarOpen ? '380px' : '0px',
          borderRadius: '8px 0 0 8px',
          background: isRightSidebarOpen ? '#0070f3' : 'rgba(0, 112, 243, 0.7)'
        }}
        onClick={() => setIsRightSidebarOpen(!isRightSidebarOpen)}
        title={isRightSidebarOpen ? "Collapse Planner" : "Expand Planner"}
      >
        {isRightSidebarOpen ? '›' : '‹'}
      </button>
    </div>
  );
} 