"use client"

import { useRouter } from "next/navigation"
import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { MessageSquare, Search, Filter, Crown, Shield } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { apiClient } from "@/lib/api-client"

interface User {
  id: string
  name: string
  email: string
  avatar_url?: string
  bio?: string
  location?: string
  created_at: string
  verified?: boolean
}

export default function UsersPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [filteredUsers, setFilteredUsers] = useState<User[]>([])

  useEffect(() => {
    fetchUsers()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    // Filter users based on search query
    if (searchQuery.trim()) {
      const filtered = users.filter(user =>
        user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.bio?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.location?.toLowerCase().includes(searchQuery.toLowerCase())
      )
      setFilteredUsers(filtered)
    } else {
      setFilteredUsers(users)
    }
  }, [searchQuery, users])

  const fetchUsers = async () => {
    try {
      setLoading(true)
      const response = await apiClient.users.list({ limit: 50 })
      setUsers(response.users || [])
      setFilteredUsers(response.users || [])
    } catch (error) {
      console.error('Error fetching users:', error)
      toast({
        title: "Error loading users",
        description: "Failed to load user profiles",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleMessage = async (user: User, e: React.MouseEvent) => {
    e.stopPropagation()
    
    try {
      // Check if user has membership (in a real app, this would check subscription status)
      const hasMembership = false // This would come from user's subscription status
      
      if (!hasMembership) {
        // Show membership popup
        const note = prompt(`Send a message to ${user.name} (Membership required for messaging):`)
        if (note && note.trim()) {
          toast({
            title: "Membership Required",
            description: "Upgrade to premium to send messages to other users",
            variant: "destructive",
          })
        }
        return
      }
      
      // If user has membership, create chat and redirect
      const note = prompt(`Send a message to ${user.name}:`)
      if (note && note.trim()) {
        try {
          // Create chat with the user
          await apiClient.chats.create(user.id)
          
          // Store chat request in localStorage for demo purposes
          const stored = JSON.parse(localStorage.getItem("chatRequests") || "[]")
          stored.push({
            id: Date.now().toString(),
            from: user.name,
            avatar: user.avatar_url,
            note,
            time: "Just now",
          })
          localStorage.setItem("chatRequests", JSON.stringify(stored))
          
          toast({
            title: "Message sent!",
            description: `Your message to ${user.name} has been sent`,
          })
          
          // Redirect to chats page
          router.push("/app/chats?tab=requests")
        } catch (error) {
          console.error('Error creating chat:', error)
          toast({
            title: "Failed to send message",
            description: "Please try again later",
            variant: "destructive",
          })
        }
      }
    } catch (error) {
      console.error('Error handling message:', error)
      toast({
        title: "Error",
        description: "Failed to process your request",
        variant: "destructive",
      })
    }
  }

  const getAgeFromDate = (dateString: string) => {
    try {
      const birthDate = new Date(dateString)
      const today = new Date()
      let age = today.getFullYear() - birthDate.getFullYear()
      const monthDiff = today.getMonth() - birthDate.getMonth()
      
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--
      }
      
      return age > 0 ? age : null
    } catch {
      return null
    }
  }

  if (loading) {
    return (
      <div className="container max-w-6xl mx-auto px-2 sm:px-4 py-4">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3">
          {[...Array(8)].map((_, i) => (
            <Card key={i} className="overflow-hidden animate-pulse">
              <div className="aspect-[3/4] bg-gray-200 dark:bg-gray-800" />
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="container max-w-6xl mx-auto px-2 sm:px-4 py-4">
      {/* Search and Filter Bar */}
      <div className="mb-6 space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search users by name, bio, or location..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 pr-10"
          />
          <Button size="icon" variant="ghost" className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7">
            <Filter className="h-4 w-4" />
          </Button>
        </div>
        
        {searchQuery && (
          <p className="text-sm text-muted-foreground">
            Found {filteredUsers.length} user{filteredUsers.length !== 1 ? 's' : ''} matching &quot;{searchQuery}&quot;
          </p>
        )}
      </div>

      {/* User Grid */}
      {filteredUsers.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3">
          {filteredUsers.map((user) => {
            const age = user.created_at ? getAgeFromDate(user.created_at) : null
            
            return (
              <Card
                key={user.id}
                className="overflow-hidden group hover:shadow-xl transition-all duration-300 border-0"
              >
                <div className="relative aspect-[3/4]">
                  {/* Main Image */}
                  <div
                    className="absolute inset-0 bg-cover bg-center"
                    style={{
                      backgroundImage: user.avatar_url 
                        ? `url(${user.avatar_url.startsWith('http') ? user.avatar_url : `https://pharmx-api.kasimhussain333.workers.dev${user.avatar_url}`})`
                        : 'none',
                      backgroundColor: user.avatar_url ? 'transparent' : '#f3f4f6'
                    }}
                  >
                    {!user.avatar_url && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Avatar className="h-16 w-16">
                          <AvatarFallback className="text-2xl bg-gradient-to-br from-blue-500 to-purple-600 text-white">
                            {user.name?.charAt(0)?.toUpperCase() || "?"}
                          </AvatarFallback>
                        </Avatar>
                      </div>
                    )}
                  </div>

                  {/* Gradient Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/80" />

                  {/* User Info & Message */}
                  <div className="absolute bottom-0 left-0 right-0 p-3 flex items-center justify-between text-white">
                    <div className="flex items-center gap-1">
                      <h3 className="font-bold text-lg">{user.name}</h3>
                      {age && <span className="text-lg opacity-90">{age}</span>}
                    </div>
                    <Button
                      size="sm"
                      className="h-8 w-8 bg-white/20 backdrop-blur-sm hover:bg-white/30 border-0 text-white"
                      onClick={(e) => handleMessage(user, e)}
                    >
                      <MessageSquare className="h-3.5 w-3.5" />
                    </Button>
                  </div>

                  {/* Verification Badge */}
                  {user.verified && (
                    <div className="absolute top-2 right-2">
                      <Shield className="h-5 w-5 text-blue-400" />
                    </div>
                  )}
                </div>
              </Card>
            )
          })}
        </div>
      ) : (
        <div className="text-center py-12">
          <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
            <Search className="h-8 w-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium mb-2">No users found</h3>
          <p className="text-muted-foreground">
            {searchQuery ? `No users match "${searchQuery}"` : "No users available at the moment"}
          </p>
          {searchQuery && (
            <Button 
              variant="outline" 
              onClick={() => setSearchQuery("")}
              className="mt-4"
            >
              Clear search
            </Button>
          )}
        </div>
      )}

      {/* Membership Notice */}
      <div className="mt-8 text-center">
        <Card className="p-6 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/20 dark:to-purple-950/20 border-blue-200 dark:border-blue-800">
          <div className="flex items-center justify-center space-x-2 mb-2">
            <Crown className="h-5 w-5 text-yellow-600" />
            <span className="font-medium text-blue-900 dark:text-blue-100">Premium Feature</span>
          </div>
          <p className="text-blue-700 dark:text-blue-300 text-sm">
            Upgrade to premium to send messages to other users and unlock unlimited connections
          </p>
        </Card>
      </div>
    </div>
  )
}
