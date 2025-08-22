"use client"

import { useState, useEffect } from "react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { 
  ChevronRight, 
  Bookmark, 
  FileText, 
  User, 
  MessageSquare, 
  Bell, 
  Shield, 
  HelpCircle, 
  Users,
  CreditCard,
  Moon,
  LogOut,
  Volume2,
  Palette,
  Camera,
  Loader2
} from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { apiClient } from "@/lib/api-client"

const settingsItems = [
  {
    id: "saved",
    icon: Bookmark,
    label: "Saved Topics",
    href: "/settings/saved",
    badge: null
  },
  {
    id: "notes",
    icon: FileText,
    label: "My Notes",
    href: "/settings/notes",
    badge: null
  },
  {
    id: "account",
    icon: User,
    label: "Account",
    href: "/settings/account",
    badge: null
  },
  {
    id: "chats",
    icon: MessageSquare,
    label: "Chats",
    href: "/settings/chats",
    badge: "2"
  },
  {
    id: "notifications",
    icon: Bell,
    label: "Notifications",
    href: "/settings/notifications",
    badge: null
  },
  {
    id: "appearance",
    icon: Palette,
    label: "App Appearance",
    href: "/settings/appearance",
    badge: null
  },
  {
    id: "help",
    icon: HelpCircle,
    label: "Help",
    href: "/settings/help",
    badge: null
  },
  {
    id: "friends",
    icon: Users,
    label: "Invite Friends",
    href: "/settings/invite",
    badge: null
  }
]

interface UserProfile {
  name: string
  email: string
  avatar: string | null
  isPremium: boolean
}

export default function SettingsPage() {
  const router = useRouter()
  const [darkMode, setDarkMode] = useState(false)
  const [notifications, setNotifications] = useState(true)
  const [soundEffects, setSoundEffects] = useState(true)
  const [user, setUser] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchUserProfile()
  }, [])

  const fetchUserProfile = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const data = await apiClient.profile.get()
      
      // Transform the API response to match our UserProfile interface
      setUser({
        name: data.username || data.name || 'User',
        email: data.email || 'No email provided',
        avatar: data.avatar_url || data.profile_picture_url || null,
        isPremium: data.is_premium || false
      })
    } catch (err) {
      console.error('Error fetching profile:', err)
      setError('Failed to load profile data')
      // Set a fallback user for development
      setUser({
        name: 'User',
        email: 'user@example.com',
        avatar: null,
        isPremium: false
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSignOut = () => {
    alert("Signing out...")
    router.push("/")
  }

  const handleUpgrade = () => {
    alert("💳 Upgrade to Premium\n\nUnlock unlimited connections for £5/month")
  }

  const handleProfileEdit = () => {
    router.push("/settings/profile")
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 bg-background/95 backdrop-blur-sm border-b z-10">
        <div className="flex items-center justify-between px-4 py-3">
          <Link href="/app/voice" className="p-2 -ml-2">
            <ChevronRight className="h-5 w-5 rotate-180" />
          </Link>
          <h1 className="text-lg font-semibold">Profile</h1>
          <div className="w-9" /> {/* Spacer for centering */}
        </div>
      </div>

      <div className="max-w-2xl mx-auto">
        {/* Profile Section */}
        <div className="px-4 py-6">
          {loading ? (
            // Loading state
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : error ? (
            // Error state
            <div className="text-center py-8">
              <p className="text-sm text-muted-foreground mb-4">{error}</p>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={fetchUserProfile}
              >
                Try Again
              </Button>
            </div>
          ) : user ? (
            // User data loaded
            <>
              <div className="flex items-center space-x-4">
                <div className="relative">
                  <Avatar className="h-20 w-20">
                    <AvatarImage src={user.avatar || undefined} />
                    <AvatarFallback>
                      {user.name
                        .split(' ')
                        .map(n => n[0])
                        .join('')
                        .toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <button 
                    onClick={handleProfileEdit}
                    className="absolute bottom-0 right-0 p-1.5 bg-primary rounded-full text-primary-foreground"
                  >
                    <Camera className="h-3.5 w-3.5" />
                  </button>
                </div>
                <div className="flex-1">
                  <h2 className="text-xl font-bold">{user.name}</h2>
                  <p className="text-sm text-muted-foreground">{user.email}</p>
                </div>
                <Button 
                  variant="outline" 
                  size="icon"
                  className="rounded-xl"
                  onClick={() => router.push("/app/users")}
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <rect x="3" y="3" width="7" height="7" strokeWidth="1.5" />
                    <rect x="14" y="3" width="7" height="7" strokeWidth="1.5" />
                    <rect x="3" y="14" width="7" height="7" strokeWidth="1.5" />
                    <rect x="14" y="14" width="7" height="7" strokeWidth="1.5" />
                  </svg>
                </Button>
              </div>

              {/* Welcome Card */}
              <Card className="mt-4 p-4 bg-gradient-to-r from-blue-500/10 to-purple-500/10 border-blue-200 dark:border-blue-800">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full">
                    <User className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm">Welcome to PharmX Social</p>
                    <p className="text-xs text-muted-foreground">Connect with new people through voice chat</p>
                  </div>
                </div>
              </Card>
            </>
          ) : null}
        </div>

        {/* Settings List */}
        <div className="px-4">
          <div className="space-y-1">
            {settingsItems.map((item) => {
              const Icon = item.icon
              return (
                <Link
                  key={item.id}
                  href={item.href}
                  className="flex items-center justify-between p-4 rounded-xl hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-muted rounded-lg">
                      <Icon className="h-5 w-5" />
                    </div>
                    <span className="font-medium">{item.label}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    {item.badge && (
                      <span className="px-2 py-0.5 text-xs font-medium bg-primary text-primary-foreground rounded-full">
                        {item.badge}
                      </span>
                    )}
                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                  </div>
                </Link>
              )
            })}
          </div>
        </div>

        {/* Quick Settings */}
        <div className="px-4 mt-6">
          <h3 className="text-sm font-semibold text-muted-foreground mb-3 px-4">PREFERENCES</h3>
          <div className="space-y-1">
            <div className="flex items-center justify-between p-4 rounded-xl hover:bg-muted/50">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-muted rounded-lg">
                  <Moon className="h-5 w-5" />
                </div>
                <span className="font-medium">Dark Mode</span>
              </div>
              <Switch 
                checked={darkMode} 
                onCheckedChange={setDarkMode}
              />
            </div>

            <div className="flex items-center justify-between p-4 rounded-xl hover:bg-muted/50">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-muted rounded-lg">
                  <Bell className="h-5 w-5" />
                </div>
                <span className="font-medium">Push Notifications</span>
              </div>
              <Switch 
                checked={notifications} 
                onCheckedChange={setNotifications}
              />
            </div>

            <div className="flex items-center justify-between p-4 rounded-xl hover:bg-muted/50">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-muted rounded-lg">
                  <Volume2 className="h-5 w-5" />
                </div>
                <span className="font-medium">Sound Effects</span>
              </div>
              <Switch 
                checked={soundEffects} 
                onCheckedChange={setSoundEffects}
              />
            </div>
          </div>
        </div>

        {/* Other Options */}
        <div className="px-4 mt-6 mb-8">
          <h3 className="text-sm font-semibold text-muted-foreground mb-3 px-4">MORE</h3>
          <div className="space-y-1">
            <Link
              href="/legal/privacy"
              className="flex items-center justify-between p-4 rounded-xl hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-muted rounded-lg">
                  <Shield className="h-5 w-5" />
                </div>
                <span className="font-medium">Privacy Policy</span>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </Link>

            <Link
              href="/legal/terms"
              className="flex items-center justify-between p-4 rounded-xl hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-muted rounded-lg">
                  <FileText className="h-5 w-5" />
                </div>
                <span className="font-medium">Terms of Service</span>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </Link>

            <button
              onClick={handleSignOut}
              className="w-full flex items-center justify-between p-4 rounded-xl hover:bg-destructive/10 transition-colors text-destructive"
            >
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-destructive/10 rounded-lg">
                  <LogOut className="h-5 w-5" />
                </div>
                <span className="font-medium">Sign Out</span>
              </div>
            </button>
          </div>
        </div>

        {/* App Version */}
        <div className="text-center py-6 text-xs text-muted-foreground">
          PharmX Voice Social v1.0.0
        </div>
      </div>
    </div>
  )
}
