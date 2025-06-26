"use client";
import { useState, useEffect } from "react";
import dynamic from 'next/dynamic';

const OOHMap = dynamic(() => import('@/components/OOHMap'), {
  ssr: false,
  loading: () => <div style={{ height: "50vh", width: "50vw", display: 'flex', justifyContent: 'center', alignItems: 'center', background: '#f8f8f8', border: "2px solid #ccc", borderRadius: "12px" }}>Loading map...</div>
});

const radiusMin = 0;
const radiusMax = 2000;
const radiusStep = 250;

interface Target {
  postcode: string;
  lat: number;
  lng: number;
}

interface Site {
  id: string;
  name: string;
  format: string;
  lat: number;
  lng: number;
  cost: number;
}

function isWithinRadius(site: Site, targets: Target[], radius: number) {
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
  const [campaignHistory, setCampaignHistory] = useState<Site[][]>([[]]);
  const campaignSites = campaignHistory[campaignHistory.length - 1] || [];
  const [postcode, setPostcode] = useState("");
  const [radius, setRadius] = useState(radiusMin);
  const [targets, setTargets] = useState<Target[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Budget state
  const [budgetInput, setBudgetInput] = useState("");
  const [budget, setBudget] = useState<number | null>(null);

  // Multi-select state
  const [isMultiSelectMode, setIsMultiSelectMode] = useState(false);
  const [multiSelectedSites, setMultiSelectedSites] = useState<Site[]>([]);

  useEffect(() => {
    const fetchSites = async () => {
      const googleSheetUrl = "https://script.google.com/macros/s/AKfycbxVCTXUBFRyYJjQlBJL_l0JcuF8VypY1EEKwDWH7RPrGtbAVfGeFmXBm7fydAtNK86C/exec";

      try {
        setSitesLoading(true);
        const res = await fetch(googleSheetUrl);
        const data = await res.json();
        
        if (data.error) {
          throw new Error(data.error);
        }

        // Map the data from the sheet to the 'Site' interface used by the map
        const mappedSites: Site[] = data.map((site: any) => ({
          id: site.frameId,
          name: site.panelName,
          format: site.formatName,
          lat: site.lat,
          lng: site.lng,
          cost: site.cost
        }));

        setSites(mappedSites);

        // Dynamically create the list of available formats from the data
        const uniqueFormats = [...new Set(mappedSites.map(site => site.format))].sort();
        setAvailableFormats(uniqueFormats);
        // By default, all formats are selected, so all sites are shown initially.
        setSelectedFormats(uniqueFormats);

      } catch (e: any) {
        console.error("Failed to fetch site data:", e);
        setError(`Failed to load site data. ${e.message}`);
      }
      setSitesLoading(false);
    };

    fetchSites();
  }, []);

  const updateCampaignSites = (updater: (prevSites: Site[]) => Site[]) => {
    setCampaignHistory(prevHistory => {
        const currentSites = prevHistory[prevHistory.length - 1] || [];
        const newSites = updater(currentSites);
        // Prevent adding identical states to history to avoid useless undo steps
        if (JSON.stringify(newSites) === JSON.stringify(currentSites)) {
            return prevHistory;
        }
        return [...prevHistory, newSites];
    });
  };

  const handleUndo = () => {
    setCampaignHistory(prevHistory => {
        if (prevHistory.length <= 1) return prevHistory; // Can't undo the initial empty state
        return prevHistory.slice(0, -1);
    });
  };

  const handleSetBudget = () => {
    const newBudget = parseFloat(budgetInput);
    if (!isNaN(newBudget) && newBudget >= 0) {
        setBudget(newBudget);
    } else {
        setBudget(null);
        setBudgetInput(""); // Clear invalid input
    }
  };

  const handleAddSiteToCampaign = (siteToAdd: Site) => {
    // Prevent adding duplicate sites
    updateCampaignSites(prev => {
      if (!prev.some(site => site.id === siteToAdd.id)) {
        return [...prev, siteToAdd];
      }
      return prev;
    });
  };

  const handleAddVisibleSitesToCampaign = () => {
    updateCampaignSites(prev => {
      const newSites = filteredSites.filter(
        (fs) => !prev.some((cs) => cs.id === fs.id)
      );
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
    updateCampaignSites(prev => {
      const newSites = multiSelectedSites.filter(
        (ms) => !prev.some((cs) => cs.id === ms.id)
      );
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

  const handleAddTarget = async () => {
    if (!postcode.trim()) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          postcode
        )}`
      );
      const data = await res.json();
      console.log("Geocode result for", postcode, data);
      if (data && data.length > 0) {
        const lat = parseFloat(data[0].lat);
        const lng = parseFloat(data[0].lon);
        setTargets((prev) => [
          ...prev,
          { postcode: postcode.trim(), lat, lng }
        ]);
        setPostcode(""); // Clear input after add
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

  const handleRemoveTarget = (postcodeToRemove: string) => {
    setTargets((prev) => prev.filter((t) => t.postcode !== postcodeToRemove));
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !loading && postcode.trim()) {
      handleAddTarget();
    }
  };

  // Filter sites by selected formats and radius
  const filteredSites = sites.filter(site => {
    // A site must always have its format selected to be shown.
    const formatIsSelected = selectedFormats.includes(site.format);
    if (!formatIsSelected) {
      return false;
    }

    // If Radius Mode is on, the site must ALSO be within the radius.
    if (isRadiusMode) {
      return isWithinRadius(site, targets, radius);
    }

    // If we're not in Radius Mode, just having the format selected is enough.
    return true;
  });

  const totalCost = campaignSites.reduce((total, site) => total + site.cost, 0);
  const remainingBudget = budget !== null ? budget - totalCost : null;
  const isOverBudget = remainingBudget !== null && remainingBudget < 0;

  return (
    <div style={{ display: "grid", gridTemplateColumns: "280px 1fr 320px", height: "100vh", background: "#f7f7f9", paddingTop: '4rem', boxSizing: 'border-box' }}>
      {/* Left Sidebar: Controls */}
      <aside style={{ padding: "1rem 1rem 2rem 2rem", background: "#fff", borderRight: "1px solid #eee", display: "flex", flexDirection: "column", gap: "2rem" }}>
        {/* Format Selection */}
        <div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer", marginBottom: 8 }} onClick={() => setIsFormatsExpanded(!isFormatsExpanded)}>
            <h2 style={{ fontSize: "1.1rem", fontWeight: 600, margin: 0 }}>Format Selection</h2>
            <span style={{ fontSize: "1.2rem", transform: isFormatsExpanded ? "rotate(0deg)" : "rotate(-90deg)", transition: "transform 0.2s" }}>▼</span>
          </div>
          {isFormatsExpanded && (
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
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: targets.length === 0 ? 'not-allowed' : 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={isRadiusMode}
                    onChange={(e) => setIsRadiusMode(e.target.checked)}
                    disabled={targets.length === 0}
                    style={{ width: 15, height: 15 }}
                  />
                  <span style={{ color: targets.length === 0 ? '#999' : '#000', fontSize: 15 }}>Radius Mode</span>
                </label>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10, maxHeight: '30vh', overflowY: 'auto', borderTop: '1px solid #ddd', paddingTop: '12px' }}>
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
          )}
        </div>
        {/* Radius Control */}
        <div style={{ position: 'relative', zIndex: 10 }}>
          <h2 style={{ fontSize: "1.1rem", fontWeight: 600, marginBottom: 8 }}>Radius (meters)</h2>
          <input
            type="range"
            min={radiusMin}
            max={radiusMax}
            step={radiusStep}
            value={radius}
            onChange={(e) => setRadius(Number(e.target.value))}
            style={{ width: "100%" }}
            disabled={targets.length === 0}
          />
          <div style={{ textAlign: "center", marginTop: 4 }}>{radius} m</div>
        </div>
        {/* Target Postcodes */}
        <div>
          <h2 style={{ fontSize: "1.1rem", fontWeight: 600, marginBottom: 8 }}>Target Postcodes</h2>
          <div style={{ display: "flex", gap: 4, marginBottom: 8 }}>
            <input
              type="text"
              value={postcode}
              onChange={(e) => setPostcode(e.target.value)}
              placeholder="Enter postcode"
              style={{ flex: 1, padding: "6px 10px", border: "1px solid #ccc", borderRadius: 4, minWidth: 0 }}
              onKeyDown={handleInputKeyDown}
              disabled={loading}
            />
            <button
              type="button"
              style={{ padding: "6px 12px", background: loading ? "#aaa" : "#0070f3", color: "#fff", border: "none", borderRadius: 4, fontWeight: 600, cursor: loading ? "not-allowed" : "pointer" }}
              onClick={() => handleAddTarget()}
              disabled={loading || !postcode.trim()}
            >
              {loading ? <span style={{ fontSize: 14 }}>...</span> : "+"}
            </button>
          </div>
          {error && <div style={{ color: "#c00", marginBottom: 6 }}>{error}</div>}
          <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
            {targets.map((t) => (
              <li key={t.postcode} style={{ display: "flex", alignItems: "center", marginBottom: 4, background: "#f3f3f3", borderRadius: 4, padding: "2px 6px" }}>
                <span style={{ flex: 1, fontSize: 14 }}>{t.postcode}</span>
                <button
                  onClick={() => handleRemoveTarget(t.postcode)}
                  style={{ marginLeft: 8, background: "none", border: "none", color: "#c00", fontWeight: 700, cursor: "pointer", fontSize: 16 }}
                  title="Remove"
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
          {targets.length > 0 && (
            <button
              type="button"
              onClick={() => { setTargets([]); setRadius(radiusMin); }}
              style={{ marginTop: 8, width: "100%", padding: "7px 0", background: "#eee", color: "#333", border: "none", borderRadius: 4, fontWeight: 600, cursor: "pointer", fontSize: 14 }}
            >
              Clear All
            </button>
          )}
        </div>
      </aside>
      {/* Map Area */}
      <main style={{ padding: "1rem 2.5rem 2.5rem 2.5rem" }}>
        <div style={{ width: "100%", height: "100%", minWidth: 320 }}>
          {sitesLoading ? (
            <div>Loading sites...</div>
          ) : (
            <OOHMap
              targets={targets}
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
      {/* Right Sidebar: Campaign Plan */}
      <aside style={{ padding: "1rem 2rem 2rem 1rem", background: "#fff", borderLeft: "1px solid #eee", display: "flex", flexDirection: "column", gap: "2rem" }}>
        <div>
          <h2 style={{ fontSize: "1.1rem", fontWeight: 600, marginBottom: 8 }}>Campaign Plan</h2>
          <div style={{ border: "1px solid #e5e7eb", borderRadius: 8, padding: "14px 12px", background: "#fff" }}>
            <div style={{ marginBottom: '1rem', borderBottom: '1px solid #eee', paddingBottom: '1rem' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 600, margin: '0 0 8px 0' }}>Campaign Budget</h3>
              <div style={{ display: "flex", gap: 4 }}>
                  <input
                      type="number"
                      value={budgetInput}
                      onChange={(e) => setBudgetInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSetBudget()}
                      placeholder="e.g. 10000"
                      style={{ flex: 1, padding: "6px 10px", border: "1px solid #ccc", borderRadius: 4, minWidth: 0 }}
                  />
                  <button
                      type="button"
                      style={{ padding: "6px 12px", background: "#0070f3", color: "#fff", border: "none", borderRadius: 4, fontWeight: 600, cursor: "pointer" }}
                      onClick={handleSetBudget}
                  >
                      Set
                  </button>
              </div>
            </div>
            <div style={{ marginBottom: '1rem', borderBottom: '1px solid #eee', paddingBottom: '1rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={isMultiSelectMode}
                  onChange={(e) => {
                    setIsMultiSelectMode(e.target.checked);
                    if (!e.target.checked) {
                      setMultiSelectedSites([]); // Clear selection when turning mode off
                    }
                  }}
                  style={{ width: 15, height: 15 }}
                />
                <span style={{ fontSize: 15 }}>Select Multiple</span>
              </label>
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
                Add {multiSelectedSites.length} Selected Sites
              </button>
            )}
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
              <button
                type="button"
                onClick={handleUndo}
                disabled={campaignHistory.length <= 1}
                style={{ flex: 1, padding: '8px', background: '#6c757d', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 14, fontWeight: 600, opacity: campaignHistory.length <= 1 ? 0.5 : 1 }}
              >
                Undo
              </button>
              <button
                type="button"
                onClick={handleClearCampaign}
                disabled={campaignSites.length === 0}
                style={{ flex: 1, padding: '8px', background: '#dc3545', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 14, fontWeight: 600, opacity: campaignSites.length === 0 ? 0.5 : 1 }}
              >
                Clear Plan
              </button>
            </div>
            {campaignSites.length === 0 ? (
              <p style={{ margin: 0, color: "#666", fontSize: 14 }}>No sites added yet.</p>
            ) : (
              <ul style={{ listStyle: 'none', margin: 0, padding: 0, maxHeight: '25vh', overflowY: 'auto' }}>
                {campaignSites.map(site => (
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
            )}
            <div style={{ borderTop: '1px solid #ccc', paddingTop: 12, marginTop: 12 }}>
              <p style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, margin: 0, fontSize: 16 }}>
                <span>Total Cost:</span>
                <span>£{totalCost.toLocaleString()}</span>
              </p>
              {budget !== null && remainingBudget !== null && (
                <p style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, margin: '8px 0 0', fontSize: 16, color: isOverBudget ? '#dc3545' : '#28a745' }}>
                  <span>{isOverBudget ? 'Over Budget:' : 'Remaining:'}</span>
                  <span>
                    {isOverBudget ? '-' : ''}£{Math.abs(remainingBudget).toLocaleString()}
                  </span>
                </p>
              )}
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
} 