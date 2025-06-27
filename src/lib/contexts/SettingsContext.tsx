// src/lib/contexts/SettingsContext.tsx
'use client'
import { createContext, useContext, useState, useEffect, useMemo } from 'react'
import useSWR, { mutate } from 'swr'
import Papa from 'papaparse';
import type { Campaign, Settings as SettingsType, TabData, Site } from '../types'
import { DEFAULT_SHEET_URL } from '../config'
import { fetchAllTabsData, getCampaigns } from '../sheetsData'

export type Settings = SettingsType & { dataSource: 'api' | 'csv' }
export type SettingsContextType = {
  settings: Settings
  updateSettings: (newSettings: Partial<Settings>) => void
  setSheetUrl: (url: string) => void
  setCurrency: (currency: string) => void
  setSelectedCampaign: (campaignId: string) => void
  fetchedData: TabData | undefined
  dataError: any
  isDataLoading: boolean
  refreshData: () => void
  campaigns: Campaign[]
  siteData: Site[] | null
  loadSitesFromFile: (file: File) => Promise<void>
  dataSource: 'api' | 'csv'
  setDataSource: (source: 'api' | 'csv') => void
}

const defaultSettings: Settings = {
  sheetUrl: DEFAULT_SHEET_URL,
  currency: '$',
  selectedCampaign: undefined,
  activeTab: 'daily',
  dataSource: 'api',
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined)

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<Settings>(defaultSettings)
  const [siteData, setSiteData] = useState<Site[] | null>(null);

  // Load settings from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('settings')
    if (saved) {
      try {
        const parsedSettings = JSON.parse(saved)
        delete parsedSettings.campaigns // Ensure campaigns are not loaded
        setSettings({ ...defaultSettings, ...parsedSettings })
      } catch {
        setSettings(defaultSettings)
      }
    }
    const savedSites = localStorage.getItem('siteData');
    if (savedSites) {
      try {
        setSiteData(JSON.parse(savedSites));
      } catch {
        setSiteData(null);
      }
    }
  }, [])

  // Save settings to localStorage
  useEffect(() => {
    const { campaigns, ...settingsToSave } = settings as any // Exclude campaigns if present
    localStorage.setItem('settings', JSON.stringify(settingsToSave))
    if (siteData) {
      localStorage.setItem('siteData', JSON.stringify(siteData));
    } else {
      localStorage.removeItem('siteData');
    }
  }, [settings, siteData])

  const setDataSource = (source: 'api' | 'csv') => {
    setSettings(prev => ({ ...prev, dataSource: source }));
  }

  // Fetch data using useSWR based on sheetUrl
  const { data: fetchedData, error: dataError, isLoading: isDataLoading, mutate: refreshData } = useSWR<TabData>(
    settings.sheetUrl && settings.sheetUrl !== DEFAULT_SHEET_URL ? settings.sheetUrl : null,
    fetchAllTabsData,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false
    }
  )

  // Calculate campaigns based on fetchedData
  const campaigns = useMemo(() => {
    return fetchedData?.daily ? getCampaigns(fetchedData.daily) : []
  }, [fetchedData])

  const setSheetUrl = (url: string) => {
    setSettings(prev => ({ ...prev, sheetUrl: url }))
  }

  const setCurrency = (currency: string) => {
    setSettings(prev => ({ ...prev, currency }))
  }

  const setSelectedCampaign = (id: string) => {
    setSettings(prev => ({ ...prev, selectedCampaign: id }))
  }

  const updateSettings = (newSettings: Partial<Settings>) => {
    setSettings(prev => ({ ...prev, ...newSettings }))
  }

  const loadSitesFromFile = (file: File): Promise<void> => {
    return new Promise((resolve, reject) => {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          try {
            const mappedSites: Site[] = results.data.map((row: any) => {
              if (!row.frameId || !row.panelName || !row.formatName || !row.lat || !row.lng || !row.cost) {
                throw new Error(`CSV is missing required headers. Found: ${Object.keys(row).join(', ')}`);
              }
              return {
                id: row.frameId,
                name: row.panelName,
                format: row.formatName,
                lat: parseFloat(row.lat),
                lng: parseFloat(row.lng),
                cost: parseFloat(row.cost),
              }
            });
            setSiteData(mappedSites);
            // Clear the sheet URL so the app prioritizes file data
            setSheetUrl('');
            setDataSource('csv');
            resolve();
          } catch (e) {
            reject(e);
          }
        },
        error: (err: any) => {
          reject(err);
        }
      });
    });
  }

  return (
    <SettingsContext.Provider value={{
      settings,
      updateSettings,
      setSheetUrl,
      setCurrency,
      setSelectedCampaign,
      fetchedData,
      dataError,
      isDataLoading,
      refreshData: () => refreshData(),
      campaigns,
      siteData,
      loadSitesFromFile,
      dataSource: settings.dataSource,
      setDataSource,
    }}>
      {children}
    </SettingsContext.Provider>
  )
}

export function useSettings() {
  const context = useContext(SettingsContext)
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider')
  }
  return context
} 