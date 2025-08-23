"use client"

import { useState, useEffect } from "react"
import { Switch } from "@/components/ui/switch"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"

import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ChevronRight, MessageSquare, Shield, Trash2, Archive, Ban } from "lucide-react"
import Link from "next/link"
import { useToast } from "@/hooks/use-toast"

interface ChatSettings {
  readReceipts: boolean
  typingIndicators: boolean
  messagePreview: boolean
  autoArchive: boolean
  blockUnknownUsers: boolean
  messageRetention: '7days' | '30days' | '90days' | 'forever'
  mediaAutoDownload: boolean
  chatBackup: boolean
}

export default function ChatSettingsPage() {
  const { toast } = useToast()
  const [settings, setSettings] = useState<ChatSettings>({
    readReceipts: true,
    typingIndicators: true,
    messagePreview: true,
    autoArchive: false,
    blockUnknownUsers: false,
    messageRetention: '30days',
    mediaAutoDownload: true,
    chatBackup: false,
  })

  useEffect(() => {
    // Load saved preferences from localStorage
    const saved = localStorage.getItem('chatSettings')
    if (saved) {
      try {
        setSettings(JSON.parse(saved))
      } catch (e) {
        console.error('Failed to parse chat settings:', e)
      }
    }
  }, [])

  const updateSetting = (key: keyof ChatSettings, value: ChatSettings[keyof ChatSettings]) => {
    const newSettings = { ...settings, [key]: value }
    setSettings(newSettings)
    localStorage.setItem('chatSettings', JSON.stringify(newSettings))
    
    toast({
      title: "Setting updated",
      description: "Your chat preference has been saved",
    })
  }

  const clearAllChats = () => {
    if (window.confirm("Are you sure you want to clear all chats? This action cannot be undone.")) {
      // Clear chats from localStorage (in a real app, this would clear from the database)
      localStorage.removeItem("chatRequests")
      toast({
        title: "Chats cleared",
        description: "All your chat history has been removed",
      })
    }
  }

  const exportChats = () => {
    // Simulate chat export
    toast({
      title: "Export started",
      description: "Your chat data is being prepared for download",
    })
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 bg-background/95 backdrop-blur-sm border-b z-10">
        <div className="flex items-center justify-between px-4 py-3">
          <Link href="/settings" className="p-2 -ml-2">
            <ChevronRight className="h-5 w-5 rotate-180" />
          </Link>
          <h1 className="text-lg font-semibold">Chat Settings</h1>
          <div className="w-9" />
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Privacy & Security */}
        <Card className="p-6">
          <div className="flex items-center space-x-3 mb-4">
            <Shield className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-semibold">Privacy & Security</h3>
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Read Receipts</p>
                <p className="text-sm text-muted-foreground">Show when messages are read</p>
              </div>
              <Switch 
                checked={settings.readReceipts} 
                onCheckedChange={(checked) => updateSetting('readReceipts', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Typing Indicators</p>
                <p className="text-sm text-muted-foreground">Show when someone is typing</p>
              </div>
              <Switch 
                checked={settings.typingIndicators} 
                onCheckedChange={(checked) => updateSetting('typingIndicators', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Message Preview</p>
                <p className="text-sm text-muted-foreground">Show message content in notifications</p>
              </div>
              <Switch 
                checked={settings.messagePreview} 
                onCheckedChange={(checked) => updateSetting('messagePreview', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Block Unknown Users</p>
                <p className="text-sm text-muted-foreground">Prevent messages from strangers</p>
              </div>
              <Switch 
                checked={settings.blockUnknownUsers} 
                onCheckedChange={(checked) => updateSetting('blockUnknownUsers', checked)}
              />
            </div>
          </div>
        </Card>

        {/* Message Management */}
        <Card className="p-6">
          <div className="flex items-center space-x-3 mb-4">
            <MessageSquare className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-semibold">Message Management</h3>
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Auto-archive Old Chats</p>
                <p className="text-sm text-muted-foreground">Move inactive chats to archive</p>
              </div>
              <Switch 
                checked={settings.autoArchive} 
                onCheckedChange={(checked) => updateSetting('autoArchive', checked)}
              />
            </div>

            <div className="space-y-2">
              <Label>Message Retention</Label>
              <Select 
                value={settings.messageRetention} 
                onValueChange={(value) => updateSetting('messageRetention', value as ChatSettings['messageRetention'])}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7days">7 days</SelectItem>
                  <SelectItem value="30days">30 days</SelectItem>
                  <SelectItem value="90days">90 days</SelectItem>
                  <SelectItem value="forever">Forever</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                How long to keep your chat messages
              </p>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Media Auto-download</p>
                <p className="text-sm text-muted-foreground">Automatically download images and videos</p>
              </div>
              <Switch 
                checked={settings.mediaAutoDownload} 
                onCheckedChange={(checked) => updateSetting('mediaAutoDownload', checked)}
              />
            </div>
          </div>
        </Card>

        {/* Data & Backup */}
        <Card className="p-6">
          <div className="flex items-center space-x-3 mb-4">
            <Archive className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-semibold">Data & Backup</h3>
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Chat Backup</p>
                <p className="text-sm text-muted-foreground">Backup chats to cloud storage</p>
              </div>
              <Switch 
                checked={settings.chatBackup} 
                onCheckedChange={(checked) => updateSetting('chatBackup', checked)}
              />
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={exportChats} className="flex-1">
                Export Chats
              </Button>
              <Button variant="outline" onClick={clearAllChats} className="flex-1">
                <Trash2 className="h-4 w-4 mr-2" />
                Clear All
              </Button>
            </div>
          </div>
        </Card>

        {/* Blocked Users */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <Ban className="h-5 w-5 text-primary" />
              <h3 className="text-lg font-semibold">Blocked Users</h3>
            </div>
            <span className="text-sm text-muted-foreground">0 users</span>
          </div>
          
          <div className="text-center py-8 text-muted-foreground">
            <Ban className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No blocked users</p>
            <p className="text-sm">Users you block won&apos;t be able to message you</p>
          </div>
        </Card>

        {/* Info */}
        <Card className="p-6 bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
          <div className="flex items-start space-x-3">
            <Shield className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
            <div>
              <h4 className="font-medium text-blue-900 dark:text-blue-100">Privacy Note</h4>
              <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                Your chat settings help control your privacy and experience. Changes are applied immediately and saved to your device.
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
} 