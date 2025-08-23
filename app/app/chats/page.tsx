"use client"

import { useState, useEffect, Suspense } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Send, Check, CheckCheck, MessageSquare,
  ArrowLeft, MoreVertical, Phone, Paperclip, Smile,
  Search, Filter
} from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useSearchParams } from "next/navigation"
import { useToast } from "@/hooks/use-toast"
import { apiClient } from "@/lib/api-client"

// Chat types
type ChatRequest = {
  id: string
  sender_id: string
  receiver_id: string
  message: string
  created_at: string
  sender_name: string
  sender_avatar?: string
  sender_bio?: string
}

type Chat = {
  id: string
  partner_id: string
  partner_name: string
  partner_avatar?: string
  last_message?: string
  last_message_time?: string
  unread_count: number
  status: string
}

type Message = {
  id: string
  sender_id: string
  content: string
  type: string
  created_at: string
  read_at?: string
  sender_name: string
  sender_avatar?: string
}

function ChatsPageContent() {
  const [selectedChat, setSelectedChat] = useState<string | null>(null)
  const [message, setMessage] = useState("")
  const [chatRequests, setChatRequests] = useState<ChatRequest[]>([])
  const [chats, setChats] = useState<Chat[]>([])
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedChatData, setSelectedChatData] = useState<any>(null)
  const searchParams = useSearchParams()
  const { toast } = useToast()

  // Load data on component mount
  useEffect(() => {
    loadChatsData()
  }, [])

  // Load chats and requests from API
  const loadChatsData = async () => {
    try {
      setLoading(true)
      
      // Load chats
      const chatsResponse = await apiClient.request('/chats?tab=messages')
      setChats(chatsResponse.chats || [])
      
      // Load requests
      const requestsResponse = await apiClient.request('/chats?tab=requests')
      setChatRequests(requestsResponse.requests || [])
      
    } catch (error) {
      console.error('Error loading chats:', error)
      toast({
        title: "Error loading chats",
        description: "Failed to load your conversations",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  // Load messages for selected chat
  const loadChatMessages = async (chatId: string) => {
    try {
      const response = await apiClient.request(`/chats/${chatId}`)
      setSelectedChatData(response.chat)
      setMessages(response.messages || [])
    } catch (error) {
      console.error('Error loading messages:', error)
      toast({
        title: "Error",
        description: "Failed to load messages",
        variant: "destructive",
      })
    }
  }

  // Handle chat selection
  const handleChatSelect = async (chatId: string) => {
    setSelectedChat(chatId)
    await loadChatMessages(chatId)
  }

  const handleAcceptRequest = async (requestId: string) => {
    try {
      const response = await apiClient.request(`/chats/request/${requestId}/accept`, {
        method: 'POST'
      })
      
      toast({
        title: "Request accepted!",
        description: "You can now chat with this person",
      })
      
      // Reload data
      await loadChatsData()
      
      // If a chat was created, select it
      if (response.chatId) {
        await handleChatSelect(response.chatId)
      }
    } catch (error) {
      console.error('Error accepting request:', error)
      toast({
        title: "Error",
        description: "Failed to accept request",
        variant: "destructive",
      })
    }
  }

  const handleDeclineRequest = async (requestId: string) => {
    try {
      await apiClient.request(`/chats/request/${requestId}/decline`, {
        method: 'POST'
      })
      
      toast({
        title: "Request declined",
        description: "The chat request has been declined",
      })
      
      // Reload data
      await loadChatsData()
    } catch (error) {
      console.error('Error declining request:', error)
      toast({
        title: "Error",
        description: "Failed to decline request",
        variant: "destructive",
      })
    }
  }

  const handleSendMessage = async () => {
    if (!message.trim() || !selectedChat) return
    
    try {
      const response = await apiClient.request(`/chats/${selectedChat}/messages`, {
        method: 'POST',
        body: JSON.stringify({ content: message.trim() })
      })
      
      // Add message to local state
      setMessages(prev => [...prev, response.message])
      setMessage("")
      
      // Update chat in list
      setChats(prev => prev.map(chat => 
        chat.id === selectedChat 
          ? { ...chat, last_message: message.trim(), unread_count: 0 }
          : chat
      ))
    } catch (error) {
      console.error('Error sending message:', error)
      toast({
        title: "Error",
        description: "Failed to send message",
        variant: "destructive",
      })
    }
  }

  const handleCall = () => {
    toast({
      title: "Voice call",
      description: "Voice calling feature coming soon!",
    })
  }

  const handleBlock = () => {
    toast({
      title: "User blocked",
      description: "This feature will be implemented soon",
    })
  }

  const handleReport = () => {
    toast({
      title: "User reported",
      description: "This feature will be implemented soon",
    })
  }

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60)
    
    if (diffInHours < 1) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    } else if (diffInHours < 24) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    } else if (diffInHours < 48) {
      return 'Yesterday'
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' })
    }
  }

  const getCurrentUserId = () => {
    // Get current user ID from stored user data
    const userData = localStorage.getItem('pharmx_user')
    if (userData) {
      const user = JSON.parse(userData)
      return user.sub || user.id
    }
    return null
  }

  // Mobile view: show chat list or conversation
  // Desktop view: show both side by side
  const isChatSelected = selectedChat !== null
  const defaultTab = searchParams.get("tab") || "chats"

  return (
    <div className="h-full flex bg-background">
      {/* Chat List - hidden on mobile when chat is selected */}
      <div className={`${isChatSelected ? 'hidden md:flex' : 'flex'} flex-col w-full md:w-[380px] border-r bg-muted/30`}>
        <Tabs defaultValue={defaultTab} className="flex-1 flex flex-col">
          <div className="p-4 space-y-3 border-b bg-background">
            {/* Search Bar */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search conversations..." 
                className="pl-9 pr-9 bg-muted/50 border-0 focus-visible:ring-1"
              />
              <Button size="icon" variant="ghost" className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7">
                <Filter className="h-4 w-4" />
              </Button>
            </div>
            
            {/* Tabs */}
            <TabsList className="grid w-full grid-cols-2 bg-muted/50">
              <TabsTrigger value="chats" className="data-[state=active]:bg-background">
                Messages
                {chats.filter(c => c.unread_count > 0).length > 0 && (
                  <div className="ml-2 h-5 w-5 bg-primary text-primary-foreground rounded-full text-xs flex items-center justify-center">
                    {chats.reduce((acc, c) => acc + c.unread_count, 0)}
                  </div>
                )}
              </TabsTrigger>
              <TabsTrigger value="requests" className="data-[state=active]:bg-background">
                Requests
                {chatRequests.length > 0 && (
                  <div className="ml-2 h-5 w-5 bg-orange-500 text-white rounded-full text-xs flex items-center justify-center">
                    {chatRequests.length}
                  </div>
                )}
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="chats" className="flex-1 overflow-y-auto m-0 px-2">
            <div className="space-y-1 py-2">
              {loading ? (
                // Loading skeleton
                Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="flex items-center p-3 rounded-xl animate-pulse">
                    <div className="h-12 w-12 bg-gray-200 rounded-full" />
                    <div className="flex-1 ml-3 space-y-2">
                      <div className="h-4 bg-gray-200 rounded w-3/4" />
                      <div className="h-3 bg-gray-200 rounded w-1/2" />
                    </div>
                  </div>
                ))
              ) : chats.length > 0 ? (
                chats.map((chat) => (
                  <div
                    key={chat.id}
                    className={`flex items-center p-3 rounded-xl cursor-pointer transition-all ${
                      selectedChat === chat.id 
                        ? 'bg-primary/10 hover:bg-primary/15' 
                        : 'hover:bg-muted/50'
                    }`}
                    onClick={() => handleChatSelect(chat.id)}
                  >
                    <div className="relative">
                      <Avatar className="h-12 w-12 ring-2 ring-background">
                        <AvatarImage src={chat.partner_avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${chat.partner_name}`} />
                        <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white">
                          {chat.partner_name?.split(' ').map(n => n[0]).join('') || '?'}
                        </AvatarFallback>
                      </Avatar>
                    </div>
                    
                    <div className="flex-1 ml-3 min-w-0">
                      <div className="flex justify-between items-start">
                        <h3 className="font-semibold truncate">{chat.partner_name}</h3>
                        <span className="text-xs text-muted-foreground ml-2">
                          {chat.last_message_time ? formatTime(chat.last_message_time) : ''}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 mt-0.5">
                        {chat.unread_count === 0 && selectedChat !== chat.id && (
                          <CheckCheck className="h-3 w-3 text-blue-500" />
                        )}
                        <p className="text-sm text-muted-foreground truncate">
                          {chat.last_message || 'No messages yet'}
                        </p>
                      </div>
                    </div>
                    
                    {chat.unread_count > 0 && (
                      <div className="ml-2 h-6 w-6 bg-primary text-primary-foreground rounded-full text-xs font-medium flex items-center justify-center">
                        {chat.unread_count}
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <MessageSquare className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No conversations yet</p>
                  <p className="text-sm">Start chatting with someone!</p>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="requests" className="flex-1 overflow-y-auto m-0 p-4 space-y-3">
            {loading ? (
              // Loading skeleton
              Array.from({ length: 2 }).map((_, i) => (
                <Card key={i} className="p-4 animate-pulse">
                  <div className="flex items-start space-x-3">
                    <div className="h-11 w-11 bg-gray-200 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-gray-200 rounded w-1/3" />
                      <div className="h-3 bg-gray-200 rounded w-full" />
                      <div className="h-3 bg-gray-200 rounded w-2/3" />
                    </div>
                  </div>
                </Card>
              ))
            ) : chatRequests.length > 0 ? (
              chatRequests.map((request) => (
                <Card key={request.id} className="p-4 bg-gradient-to-r from-orange-50 to-orange-100/50 dark:from-orange-950/20 dark:to-orange-900/10 border-orange-200 dark:border-orange-800">
                  <div className="flex items-start space-x-3">
                    <Avatar className="h-11 w-11 ring-2 ring-orange-200 dark:ring-orange-800">
                      <AvatarImage src={request.sender_avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${request.sender_name}`} />
                      <AvatarFallback className="bg-gradient-to-br from-orange-400 to-orange-600 text-white">
                        {request.sender_name?.split(' ').map(n => n[0]).join('') || '?'}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div className="flex-1">
                      <div className="flex justify-between items-start">
                        <h4 className="font-semibold">{request.sender_name}</h4>
                        <span className="text-xs text-muted-foreground">{formatTime(request.created_at)}</span>
                      </div>
                      {request.message && (
                        <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{request.message}</p>
                      )}
                      
                      <div className="flex gap-2 mt-3">
                        <Button
                          size="sm"
                          className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white"
                          onClick={() => handleAcceptRequest(request.id)}
                        >
                          Accept
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-950 dark:hover:text-red-400"
                          onClick={() => handleDeclineRequest(request.id)}
                        >
                          Decline
                        </Button>
                      </div>
                    </div>
                  </div>
                </Card>
              ))
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <MessageSquare className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No chat requests</p>
                <p className="text-sm">People you connect with will appear here</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Chat Conversation */}
      {selectedChat && selectedChatData ? (
        <div className="flex-1 flex flex-col bg-background">
          {/* Chat Header */}
          <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-4 py-3 flex items-center justify-between">
            <div className="flex items-center">
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden mr-2 h-8 w-8"
                onClick={() => setSelectedChat(null)}
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <Avatar className="h-10 w-10 mr-3 ring-2 ring-background">
                <AvatarImage src={selectedChatData.partner.avatarUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${selectedChatData.partner.name}`} />
                <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white">
                  {selectedChatData.partner.name?.split(' ').map((n: string) => n[0]).join('') || '?'}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <h3 className="font-semibold">{selectedChatData.partner.name}</h3>
                <div className="flex items-center gap-1">
                  <div className="h-2 w-2 bg-green-500 rounded-full" />
                  <p className="text-xs text-muted-foreground">Active now</p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Button
                size="icon"
                variant="ghost"
                className="h-9 w-9 rounded-full"
                onClick={handleCall}
              >
                <Phone className="h-4 w-4" />
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-9 w-9 rounded-full"
                  >
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={handleBlock}>Block</DropdownMenuItem>
                  <DropdownMenuItem onClick={handleReport}>Report</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-muted/20">
            <div className="max-w-3xl mx-auto space-y-3">
              {messages.length > 0 ? (
                messages.map((msg, index) => {
                  const currentUserId = getCurrentUserId()
                  const isSent = msg.sender_id === currentUserId
                  const prevMsg = index > 0 ? messages[index - 1] : null
                  const showAvatar = !isSent && (!prevMsg || prevMsg.sender_id !== msg.sender_id)
                  
                  return (
                    <div
                      key={msg.id}
                      className={`flex items-end gap-2 ${isSent ? 'justify-end' : 'justify-start'}`}
                    >
                      {showAvatar && (
                        <Avatar className="h-8 w-8 mb-1">
                          <AvatarImage src={msg.sender_avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${msg.sender_name}`} />
                          <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white text-xs">
                            {msg.sender_name?.split(' ').map(n => n[0]).join('') || '?'}
                          </AvatarFallback>
                        </Avatar>
                      )}
                      {!isSent && !showAvatar && (
                        <div className="w-8" />
                      )}
                      
                      <div className={`group relative max-w-[70%] ${isSent ? 'items-end' : 'items-start'}`}>
                        <div
                          className={`rounded-2xl px-4 py-2.5 ${
                            isSent
                              ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-br-sm'
                              : 'bg-background border rounded-bl-sm shadow-sm'
                          }`}
                        >
                          <p className="text-sm leading-relaxed">{msg.content}</p>
                        </div>
                        <div className={`flex items-center gap-1.5 mt-1 px-1 ${
                          isSent ? 'justify-end' : 'justify-start'
                        }`}>
                          <span className="text-xs text-muted-foreground">{formatTime(msg.created_at)}</span>
                          {isSent && (
                            msg.read_at ? (
                              <CheckCheck className="h-3.5 w-3.5 text-blue-500" />
                            ) : (
                              <Check className="h-3.5 w-3.5 text-muted-foreground" />
                            )
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <MessageSquare className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No messages yet</p>
                  <p className="text-sm">Start the conversation!</p>
                </div>
              )}
            </div>
          </div>

          {/* Message Input */}
          <div className="border-t bg-background p-4">
            <div className="max-w-3xl mx-auto">
              <div className="flex items-end gap-2">
                <Button 
                  size="icon" 
                  variant="ghost" 
                  className="h-10 w-10 rounded-full shrink-0"
                >
                  <Paperclip className="h-5 w-5" />
                </Button>
                <div className="flex-1 relative">
                  <Input
                    placeholder="Type a message..."
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
                    className="pr-10 bg-muted/50 border-0 focus-visible:ring-1 rounded-full py-6"
                  />
                  <Button 
                    size="icon" 
                    variant="ghost" 
                    className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full"
                  >
                    <Smile className="h-5 w-5" />
                  </Button>
                </div>
                <Button 
                  onClick={handleSendMessage}
                  size="icon"
                  className="h-10 w-10 rounded-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 shrink-0"
                  disabled={!message.trim()}
                >
                  <Send className="h-5 w-5" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="hidden md:flex flex-1 items-center justify-center bg-muted/10">
          <div className="text-center space-y-4">
            <div className="h-20 w-20 mx-auto rounded-full bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-950 dark:to-purple-950 flex items-center justify-center">
              <MessageSquare className="h-10 w-10 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="space-y-2">
              <h3 className="font-semibold text-lg">Your messages</h3>
              <p className="text-muted-foreground text-sm max-w-sm mx-auto">
                Send messages to people you&apos;ve connected with on PharmX
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function ChatsPage() {
  return (
    <Suspense fallback={<div className="p-4">Loading...</div>}>
      <ChatsPageContent />
    </Suspense>
  )
}
