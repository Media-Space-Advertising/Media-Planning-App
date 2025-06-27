// src/app/settings/page.tsx

'use client'

import { useSettings } from '@/lib/contexts/SettingsContext'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { fetchAllTabsData, getCampaigns } from '@/lib/sheetsData'
import { CURRENCY_OPTIONS } from '@/lib/utils'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowRight } from 'lucide-react'
import { useToast } from "@/hooks/use-toast"

const CSV_TEMPLATE = `frameId,panelName,formatName,lat,lng,cost\n123,Site A,48 sheet,51.4545,-2.5879,100\n124,Site B,6 sheet,51.4550,-2.5890,80\n`;

export default function SettingsPage() {
  const router = useRouter()
  const { settings, setSheetUrl, setCurrency, refreshData, isDataLoading: isContextLoading, dataError: contextError, loadSitesFromFile, siteData, updateSettings } = useSettings()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string>()
  const [dataSource, setDataSource] = useState(siteData ? 'csv' : 'api');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (contextError) {
      setError('Error loading initial data. Check URL or network.');
    }
  }, [contextError]);

  // Handle data source switch
  useEffect(() => {
    if (dataSource === 'api') {
      // Clear uploaded site data and restore sheet URL
      localStorage.removeItem('siteData');
    }
    // If switching to CSV, do nothing (user will upload)
  }, [dataSource]);

  const handleUpdate = async () => {
    setIsLoading(true)
    setError(undefined)
    try {
      await refreshData()
      router.push('/map')
    } catch (err) {
      console.error('Error updating data:', err)
      setError('Failed to update data. Please check your Sheet URL or network connection.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleCSVUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsLoading(true);
    setError(undefined);
    try {
      await loadSitesFromFile(file);
      setDataSource('csv');
      setError(undefined);
      window.location.reload(); // reload to re-trigger data fetch
    } catch (err: any) {
      setError(err.message || 'Failed to load CSV.');
    } finally {
      setIsLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDownloadTemplate = () => {
    const blob = new Blob([CSV_TEMPLATE], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'site-template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-[1400px] mx-auto px-4 py-12 mt-16">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-3xl font-bold text-gray-900 mb-12">Settings</h1>

          <Card className="p-6 bg-white shadow-sm">
            <div className="space-y-6">
              <div className="space-y-4">
                <div>
                  <Label className="text-base">Data Source</Label>
                  <div className="flex gap-6 mt-2">
                    <label className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="dataSource"
                        value="api"
                        checked={dataSource === 'api'}
                        onChange={() => setDataSource('api')}
                      />
                      <span>API / Google Sheet</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="dataSource"
                        value="csv"
                        checked={dataSource === 'csv'}
                        onChange={() => setDataSource('csv')}
                      />
                      <span>CSV Upload</span>
                    </label>
                  </div>
                </div>

                {dataSource === 'api' && (
                  <div>
                    <Label htmlFor="sheetUrl" className="text-base">
                      Google Sheet URL
                    </Label>
                    <div className="mt-2">
                      <Input
                        id="sheetUrl"
                        value={settings.sheetUrl}
                        onChange={(e) => setSheetUrl(e.target.value)}
                        placeholder="Enter your Google Sheet URL"
                        className="h-12"
                      />
                    </div>
                  </div>
                )}

                {dataSource === 'csv' && (
                  <div className="space-y-2">
                    <Label className="text-base">Upload Site List (CSV)</Label>
                    <div className="flex gap-4 items-center mt-2">
                      <Input
                        type="file"
                        accept=".csv"
                        onChange={handleCSVUpload}
                        ref={fileInputRef}
                        className="h-12 w-full"
                      />
                      <Button type="button" onClick={handleDownloadTemplate} className="h-12 whitespace-nowrap">
                        Download Template
                      </Button>
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      Required headers: <code>frameId, panelName, formatName, lat, lng, cost</code>
                    </div>
                  </div>
                )}

                <div>
                  <Label className="text-base">Currency</Label>
                  <div className="mt-2">
                    <Select value={settings.currency} onValueChange={setCurrency}>
                      <SelectTrigger className="h-12 w-[200px]">
                        <SelectValue placeholder="Select currency" />
                      </SelectTrigger>
                      <SelectContent>
                        {CURRENCY_OPTIONS.map(option => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {error && (
                <div className="text-sm text-red-500 bg-red-50 p-3 rounded-md">
                  {error}
                </div>
              )}

              <div className="pt-4">
                <Button
                  onClick={handleUpdate}
                  disabled={isLoading || isContextLoading || (dataSource === 'api' && !settings.sheetUrl)}
                  className="w-full h-12 text-lg bg-[#ea580c] hover:bg-[#c2410c] text-white"
                >
                  {isLoading || isContextLoading ? (
                    'Updating...'
                  ) : (
                    <span className="flex items-center gap-2">
                      Update & View Dashboard
                      <ArrowRight className="w-5 h-5" />
                    </span>
                  )}
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
} 