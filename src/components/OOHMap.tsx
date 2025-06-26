"use client";

import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import React, { useEffect } from "react";

// Fix Leaflet's default icon path (do this ONCE, outside the component)
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png",
});

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

interface OOHMapProps {
  targets: Target[];
  radius?: number;
  sites?: Site[];
  campaignSites: Site[];
  onSiteSelect: (site: Site) => void;
  isMultiSelectMode: boolean;
  multiSelectedSites: Site[];
  onSiteMultiSelect: (site: Site) => void;
}

function MapUpdater({ targets }: { targets: Target[] }) {
  const map = useMap();
  useEffect(() => {
    if (targets.length === 0) return;

    if (targets.length === 1) {
      map.setView([targets[0].lat, targets[0].lng], 13);
    } else {
      const bounds = new L.LatLngBounds(targets.map(t => [t.lat, t.lng]));
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [targets, map]);

  return null;
}

// Custom icon for OOH sites (blue)
const siteIcon = new L.Icon({
  iconUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
  className: "site-marker"
});

// Custom icon for selected OOH sites (green)
const selectedSiteIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-green.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

// Custom icon for sites selected in multi-select mode (orange)
const multiSelectIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-orange.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

// Custom icon for target postcodes (red)
const redIcon = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png",
  iconRetinaUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png",
  shadowUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
  className: "target-marker"
});

export default function OOHMap({ 
  targets, 
  radius, 
  sites = [], 
  campaignSites, 
  onSiteSelect,
  isMultiSelectMode,
  multiSelectedSites,
  onSiteMultiSelect
}: OOHMapProps) {
  const defaultPosition: [number, number] = [51.505, -0.09]; // London

  const isSiteInCampaign = (siteId: string) => {
    return campaignSites.some(cs => cs.id === siteId);
  };

  const isSiteInMultiSelect = (siteId: string) => {
    return multiSelectedSites.some(ms => ms.id === siteId);
  }

  const getIcon = (site: Site) => {
    if (isSiteInCampaign(site.id)) {
      return selectedSiteIcon; // Green for "in plan"
    }
    if (isSiteInMultiSelect(site.id)) {
      return multiSelectIcon; // Orange for "staged"
    }
    return siteIcon; // Default blue
  }

  return (
    <div style={{ height: '100%', width: '100%' }}>
      <MapContainer
        center={defaultPosition}
        zoom={13}
        style={{ height: "100%", width: "100%", borderRadius: "12px", boxShadow: "0 2px 8px rgba(0,0,0,0.08)" }}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />
        <MapUpdater targets={targets} />
        {/* OOH Site Markers */}
        {sites.map(site => (
          <Marker 
            key={site.id} 
            position={[site.lat, site.lng]} 
            icon={getIcon(site)}
            eventHandlers={{
              click: () => {
                if (isMultiSelectMode) {
                  onSiteMultiSelect(site);
                }
              },
            }}
          >
            <Popup>
              <strong>{site.name}</strong><br />
              Format: {site.format}<br />
              Cost: £{site.cost}
              <br /><br />
              <button
                onClick={() => onSiteSelect(site)}
                disabled={isSiteInCampaign(site.id)}
                style={{
                  padding: '6px 10px',
                  width: '100%',
                  background: isSiteInCampaign(site.id) ? '#ccc' : '#0070f3',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 4,
                  cursor: isSiteInCampaign(site.id) ? 'not-allowed' : 'pointer',
                  fontSize: 14
                }}
              >
                {isSiteInCampaign(site.id) ? 'In Plan' : 'Add to Plan'}
              </button>
            </Popup>
          </Marker>
        ))}
        {/* Target Postcode Markers and Circles */}
        {targets.map((t) => (
          <React.Fragment key={t.postcode}>
            <Marker position={[t.lat, t.lng]} icon={redIcon}>
              <Popup>Target: {t.postcode}<br />{t.lat.toFixed(5)}, {t.lng.toFixed(5)}</Popup>
            </Marker>
            {radius && radius > 0 && (
              <Circle
                center={[t.lat, t.lng]}
                radius={radius}
                pathOptions={{ color: "#0070f3", fillColor: "#0070f3", fillOpacity: 0.15 }}
              />
            )}
          </React.Fragment>
        ))}
      </MapContainer>
    </div>
  );
} 