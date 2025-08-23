"use client"

import { useState, useEffect } from "react"
import { Switch } from "@/components/ui/switch"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { ChevronRight, Bell, MessageSquare, Users, Phone, Volume2 } from "lucide-react"
import Link from "next/link"
import { useToast } from "@/hooks/use-toast"

interface NotificationSettings {
  pushEnabled: boolean
  voiceCallNotifications: boolean
  newMatchNotifications: boolean
  messageNotifications: boolean
  soundEnabled: boolean
  vibrationEnabled: boolean
  emailNotifications: boolean
}

export default function NotificationsSettingsPage() {
  const { toast } = useToast()
  const [settings, setSettings] = useState<NotificationSettings>({
    pushEnabled: true,
    voiceCallNotifications: true,
    newMatchNotifications: true,
    messageNotifications: true,
    soundEnabled: true,
    vibrationEnabled: true,
    emailNotifications: false,
  })
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    // Load saved preferences from localStorage
    const saved = localStorage.getItem('notificationSettings')
    if (saved) {
      try {
        setSettings(JSON.parse(saved))
      } catch (e) {
        console.error('Failed to parse notification settings:', e)
      }
    }
  }, [])

  const updateSetting = (key: keyof NotificationSettings, value: boolean) => {
    const newSettings = { ...settings, [key]: value }
    setSettings(newSettings)
    
    // Save to localStorage
    localStorage.setItem('notificationSettings', JSON.stringify(newSettings))
    
    // If disabling push notifications, disable all sub-notifications
    if (key === 'pushEnabled' && !value) {
      const disabledSettings = {
        ...newSettings,
        voiceCallNotifications: false,
        newMatchNotifications: false,
        messageNotifications: false,
      }
      setSettings(disabledSettings)
      localStorage.setItem('notificationSettings', JSON.stringify(disabledSettings))
    }
  }

  const requestNotificationPermission = async () => {
    if (!('Notification' in window)) {
      toast({
        title: "Not supported",
        description: "This browser doesn't support notifications",
        variant: "destructive",
      })
      return
    }

    setLoading(true)
    
    try {
      const permission = await Notification.requestPermission()
      
      if (permission === 'granted') {
        updateSetting('pushEnabled', true)
        toast({
          title: "Notifications enabled",
          description: "You'll now receive push notifications",
        })
      } else {
        updateSetting('pushEnabled', false)
        toast({
          title: "Notifications denied",
          description: "You can enable them later in your browser settings",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error('Error requesting notification permission:', error)
      toast({
        title: "Error",
        description: "Failed to request notification permission",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const testNotification = () => {
    if (Notification.permission === 'granted') {
      new Notification('Test Notification', {
        body: 'This is a test notification from PharmX Social',
        icon: '/icon-192x192.png',
      })
    } else {
      toast({
        title: "Notifications disabled",
        description: "Enable notifications first to test",
        variant: "destructive",
      })
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
          <h1 className="text-lg font-semibold">Notifications</h1>
          <div className="w-9" />
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Push Notifications */}
        <Card className="p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Bell className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold">Push Notifications</h3>
                <p className="text-sm text-muted-foreground">
                  Receive notifications when the app is closed
                </p>
              </div>
            </div>
            <Switch 
              checked={settings.pushEnabled} 
              onCheckedChange={(checked) => {
                if (checked && Notification.permission !== 'granted') {
                  requestNotificationPermission()
                } else {
                  updateSetting('pushEnabled', checked)
                }
              }}
              disabled={loading}
            />
          </div>
          
          {!settings.pushEnabled && Notification.permission === 'denied' && (
            <div className="text-xs text-muted-foreground bg-muted/50 p-3 rounded-lg">
              Notifications are blocked in your browser. To enable them, click the lock icon in your address bar and allow notifications.
            </div>
          )}
          
          {settings.pushEnabled && (
            <Button
              variant="outline"
              size="sm"
              onClick={testNotification}
              className="mt-2"
            >
              Test Notification
            </Button>
          )}
        </Card>

        {/* Notification Types */}
        <div className="space-y-3">
          <h3 className="text-lg font-semibold">Notification Types</h3>
          
          <div className="space-y-2">
            <div className="flex items-center justify-between p-4 rounded-lg border hover:bg-muted/50 transition-colors">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-green-500/10 rounded-lg">
                  <Phone className="h-4 w-4 text-green-500" />
                </div>
                <div>
                  <p className="font-medium">Voice Calls</p>
                  <p className="text-sm text-muted-foreground">When someone wants to start a voice chat</p>
                </div>
              </div>
              <Switch 
                checked={settings.voiceCallNotifications && settings.pushEnabled} 
                onCheckedChange={(checked) => updateSetting('voiceCallNotifications', checked)}
                disabled={!settings.pushEnabled}
              />
            </div>

            <div className="flex items-center justify-between p-4 rounded-lg border hover:bg-muted/50 transition-colors">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-blue-500/10 rounded-lg">
                  <Users className="h-4 w-4 text-blue-500" />
                </div>
                <div>
                  <p className="font-medium">New Matches</p>
                  <p className="text-sm text-muted-foreground">When you connect with someone new</p>
                </div>
              </div>
              <Switch 
                checked={settings.newMatchNotifications && settings.pushEnabled} 
                onCheckedChange={(checked) => updateSetting('newMatchNotifications', checked)}
                disabled={!settings.pushEnabled}
              />
            </div>

            <div className="flex items-center justify-between p-4 rounded-lg border hover:bg-muted/50 transition-colors">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-purple-500/10 rounded-lg">
                  <MessageSquare className="h-4 w-4 text-purple-500" />
                </div>
                <div>
                  <p className="font-medium">Messages</p>
                  <p className="text-sm text-muted-foreground">When you receive new messages</p>
                </div>
              </div>
              <Switch 
                checked={settings.messageNotifications && settings.pushEnabled} 
                onCheckedChange={(checked) => updateSetting('messageNotifications', checked)}
                disabled={!settings.pushEnabled}
              />
            </div>
          </div>
        </div>

        {/* Sound & Haptics */}
        <div className="space-y-3">
          <h3 className="text-lg font-semibold">Sound & Haptics</h3>
          
          <div className="space-y-2">
            <div className="flex items-center justify-between p-4 rounded-lg border hover:bg-muted/50 transition-colors">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-orange-500/10 rounded-lg">
                  <Volume2 className="h-4 w-4 text-orange-500" />
                </div>
                <div>
                  <p className="font-medium">Notification Sounds</p>
                  <p className="text-sm text-muted-foreground">Play sound for notifications</p>
                </div>
              </div>
              <Switch 
                checked={settings.soundEnabled} 
                onCheckedChange={(checked) => updateSetting('soundEnabled', checked)}
              />
            </div>

            <div className="flex items-center justify-between p-4 rounded-lg border hover:bg-muted/50 transition-colors">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-pink-500/10 rounded-lg">
                  <Phone className="h-4 w-4 text-pink-500" />
                </div>
                <div>
                  <p className="font-medium">Vibration</p>
                  <p className="text-sm text-muted-foreground">Vibrate for notifications</p>
                </div>
              </div>
              <Switch 
                checked={settings.vibrationEnabled} 
                onCheckedChange={(checked) => updateSetting('vibrationEnabled', checked)}
              />
            </div>
          </div>
        </div>

        {/* Email Notifications */}
        <div className="space-y-3">
          <h3 className="text-lg font-semibold">Email</h3>
          
          <div className="flex items-center justify-between p-4 rounded-lg border hover:bg-muted/50 transition-colors">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-gray-500/10 rounded-lg">
                <Bell className="h-4 w-4 text-gray-500" />
              </div>
              <div>
                <p className="font-medium">Email Notifications</p>
                <p className="text-sm text-muted-foreground">Receive important updates via email</p>
              </div>
            </div>
            <Switch 
              checked={settings.emailNotifications} 
              onCheckedChange={(checked) => updateSetting('emailNotifications', checked)}
            />
          </div>
        </div>

        {/* Info Card */}
        <Card className="p-4 bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
          <div className="flex items-start space-x-3">
            <Bell className="h-5 w-5 text-blue-500 mt-0.5" />
            <div>
              <h4 className="font-medium text-blue-900 dark:text-blue-100">About Notifications</h4>
              <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                We&apos;ll only send you notifications for important events. You can customize these settings anytime.
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}
