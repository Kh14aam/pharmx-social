"use client"

import { useState, useEffect } from "react"
import { Switch } from "@/components/ui/switch"

import { Card } from "@/components/ui/card"
import { ChevronRight, Palette, Moon, Sun, Monitor, Smartphone, Tablet } from "lucide-react"
import Link from "next/link"

interface AppearanceSettings {
  theme: 'light' | 'dark' | 'system'
  fontSize: 'small' | 'medium' | 'large'
  compactMode: boolean
  showAnimations: boolean
  highContrast: boolean
}

export default function AppearanceSettingsPage() {
  const [settings, setSettings] = useState<AppearanceSettings>({
    theme: 'system',
    fontSize: 'medium',
    compactMode: false,
    showAnimations: true,
    highContrast: false,
  })

  useEffect(() => {
    // Load saved preferences from localStorage
    const saved = localStorage.getItem('appearanceSettings')
    if (saved) {
      try {
        setSettings(JSON.parse(saved))
      } catch (e) {
        console.error('Failed to parse appearance settings:', e)
      }
    }
  }, [])

  const updateSetting = <K extends keyof AppearanceSettings>(key: K, value: AppearanceSettings[K]) => {
    const newSettings = { ...settings, [key]: value }
    setSettings(newSettings)
    localStorage.setItem('appearanceSettings', JSON.stringify(newSettings))
    
    // Apply theme changes immediately
    if (key === 'theme') {
      applyTheme(value as string)
    }
  }

  const applyTheme = (theme: string) => {
    const root = document.documentElement
    if (theme === 'dark') {
      root.classList.add('dark')
    } else if (theme === 'light') {
      root.classList.remove('dark')
    } else {
      // System theme
      if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
        root.classList.add('dark')
      } else {
        root.classList.remove('dark')
      }
    }
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 bg-background/95 backdrop-blur-sm border-b z-10">
        <div className="flex items-center justify-between px-4 py-3">
          <Link href="/settings" className="p-2 -ml-2">
            <ChevronRight className="h-5 w-5 rotate-180" />
          </Link>
          <h1 className="text-lg font-semibold">App Appearance</h1>
          <div className="w-9" />
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Theme Selection */}
        <Card className="p-6">
          <div className="flex items-center space-x-3 mb-4">
            <Palette className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-semibold">Theme</h3>
          </div>
          
          <div className="space-y-3">
            <div className="flex items-center justify-between p-4 rounded-lg border hover:bg-muted/50 transition-colors">
              <div className="flex items-center space-x-3">
                <Sun className="h-4 w-4 text-yellow-500" />
                <div>
                  <p className="font-medium">Light</p>
                  <p className="text-sm text-muted-foreground">Clean, bright interface</p>
                </div>
              </div>
              <input
                type="radio"
                name="theme"
                value="light"
                checked={settings.theme === 'light'}
                onChange={(e) => updateSetting('theme', e.target.value as 'light' | 'dark' | 'system')}
                className="text-primary"
              />
            </div>

            <div className="flex items-center justify-between p-4 rounded-lg border hover:bg-muted/50 transition-colors">
              <div className="flex items-center space-x-3">
                <Moon className="h-4 w-4 text-blue-500" />
                <div>
                  <p className="font-medium">Dark</p>
                  <p className="text-sm text-muted-foreground">Easy on the eyes</p>
                </div>
              </div>
              <input
                type="radio"
                name="theme"
                value="dark"
                checked={settings.theme === 'dark'}
                onChange={(e) => updateSetting('theme', e.target.value as 'light' | 'dark' | 'system')}
                className="text-primary"
              />
            </div>

            <div className="flex items-center justify-between p-4 rounded-lg border hover:bg-muted/50 transition-colors">
              <div className="flex items-center space-x-3">
                <Monitor className="h-4 w-4 text-gray-500" />
                <div>
                  <p className="font-medium">System</p>
                  <p className="text-sm text-muted-foreground">Follows your device</p>
                </div>
              </div>
              <input
                type="radio"
                name="theme"
                value="system"
                checked={settings.theme === 'system'}
                onChange={(e) => updateSetting('theme', e.target.value as 'light' | 'dark' | 'system')}
                className="text-primary"
              />
            </div>
          </div>
        </Card>

        {/* Font Size */}
        <Card className="p-6">
          <div className="flex items-center space-x-3 mb-4">
            <Palette className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-semibold">Text Size</h3>
          </div>
          
          <div className="space-y-3">
            {(['small', 'medium', 'large'] as const).map((size) => (
              <div key={size} className="flex items-center justify-between p-4 rounded-lg border hover:bg-muted/50 transition-colors">
                <div className="flex items-center space-x-3">
                  <div className={`font-medium ${
                    size === 'small' ? 'text-sm' : 
                    size === 'medium' ? 'text-base' : 'text-lg'
                  }`}>
                    {size.charAt(0).toUpperCase() + size.slice(1)}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {size === 'small' ? 'Compact text' : 
                     size === 'medium' ? 'Standard size' : 'Large, easy to read'}
                  </p>
                </div>
                <input
                  type="radio"
                  name="fontSize"
                  value={size}
                  checked={settings.fontSize === size}
                  onChange={(e) => updateSetting('fontSize', e.target.value as 'small' | 'medium' | 'large')}
                  className="text-primary"
                />
              </div>
            ))}
          </div>
        </Card>

        {/* Other Options */}
        <Card className="p-6">
          <div className="flex items-center space-x-3 mb-4">
            <Palette className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-semibold">Other Options</h3>
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Compact Mode</p>
                <p className="text-sm text-muted-foreground">Reduce spacing for more content</p>
              </div>
              <Switch 
                checked={settings.compactMode} 
                onCheckedChange={(checked) => updateSetting('compactMode', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Show Animations</p>
                <p className="text-sm text-muted-foreground">Enable smooth transitions</p>
              </div>
              <Switch 
                checked={settings.showAnimations} 
                onCheckedChange={(checked) => updateSetting('showAnimations', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">High Contrast</p>
                <p className="text-sm text-muted-foreground">Enhanced visibility</p>
              </div>
              <Switch 
                checked={settings.highContrast} 
                onCheckedChange={(checked) => updateSetting('highContrast', checked)}
              />
            </div>
          </div>
        </Card>

        {/* Preview */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Preview</h3>
          <div className="space-y-4">
            <div className="flex items-center space-x-4">
              <Smartphone className="h-8 w-8 text-muted-foreground" />
              <div>
                <p className="font-medium">Mobile</p>
                <p className="text-sm text-muted-foreground">Optimized for phones</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Tablet className="h-8 w-8 text-muted-foreground" />
              <div>
                <p className="font-medium">Tablet</p>
                <p className="text-sm text-muted-foreground">Adaptive layout</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Monitor className="h-8 w-8 text-muted-foreground" />
              <div>
                <p className="font-medium">Desktop</p>
                <p className="text-sm text-muted-foreground">Full-featured experience</p>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
} 