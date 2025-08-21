"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Input } from "@/components/ui/input"
import { 
  Phone, Send, Check, CheckCheck, MessageSquare, 
  ArrowLeft, Video, MoreVertical, Paperclip, Smile,
  Search, Filter
} from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

// Mock data
const mockChatRequests = [
  {
    id: "1",
    from: "Alex Martinez",
    avatar: null,
    note: "Hey! Saw your profile and would love to chat about hiking spots",
    time: "2 hours ago"
  },
  {
    id: "2",
    from: "Rachel Green",
    avatar: null,
    note: "Hi there! Fellow coffee enthusiast here ☕",
    time: "5 hours ago"
  }
]

const mockConversations = [
  {
    id: "1",
    name: "Sophie Turner",
    avatar: null,
    lastMessage: "That sounds great! Let's definitely plan that hike",
    time: "10:30 AM",
    unread: 2,
    online: true
  },
  {
    id: "2",
    name: "Tom Wilson",
    avatar: null,
    lastMessage: "Haha yeah, that was hilarious!",
    time: "Yesterday",
    unread: 0,
    online: false
  },
  {
    id: "3",
    name: "Emily Chen",
    avatar: null,
    lastMessage: "Thanks for the book recommendation",
    time: "2 days ago",
    unread: 0,
    online: true
  }
]

const mockMessages = [
  {
    id: "1",
    sender: "Sophie Turner",
    content: "Hey! How's your day going?",
    time: "10:15 AM",
    sent: false
  },
  {
    id: "2",
    sender: "You",
    content: "Pretty good! Just finished a morning run. You?",
    time: "10:20 AM",
    sent: true,
    read: true
  },
  {
    id: "3",
    sender: "Sophie Turner",
    content: "Nice! I'm planning a hike this weekend",
    time: "10:25 AM",
    sent: false
  },
  {
    id: "4",
    sender: "Sophie Turner",
    content: "Want to join?",
    time: "10:26 AM",
    sent: false
  },
  {
    id: "5",
    sender: "You",
    content: "That sounds great! Let's definitely plan that hike",
    time: "10:30 AM",
    sent: true,
    read: false
  }
]

export default function ChatsPage() {
  const [selectedChat, setSelectedChat] = useState<string | null>(null)
  const [message, setMessage] = useState("")

  const handleAcceptRequest = (id: string) => {
    alert(`Chat request from ${mockChatRequests.find(r => r.id === id)?.from} accepted!`)
  }

  const handleDeclineRequest = (id: string) => {
    alert(`Chat request from ${mockChatRequests.find(r => r.id === id)?.from} declined.`)
  }

  const handleSendMessage = () => {
    if (message.trim()) {
      alert(`Message sent: ${message}`)
      setMessage("")
    }
  }

  const handleCall = () => {
    alert("Starting voice call...")
  }

  // Mobile view: show chat list or conversation
  // Desktop view: show both side by side
  const isChatSelected = selectedChat !== null

  return (
    <div className="h-[calc(100vh-8rem)] flex bg-background">
      {/* Chat List - hidden on mobile when chat is selected */}
      <div className={`${isChatSelected ? 'hidden md:flex' : 'flex'} flex-col w-full md:w-[380px] border-r bg-muted/30`}>
        <Tabs defaultValue="chats" className="flex-1 flex flex-col">
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
                {mockConversations.filter(c => c.unread > 0).length > 0 && (
                  <div className="ml-2 h-5 w-5 bg-primary text-primary-foreground rounded-full text-xs flex items-center justify-center">
                    {mockConversations.reduce((acc, c) => acc + c.unread, 0)}
                  </div>
                )}
              </TabsTrigger>
              <TabsTrigger value="requests" className="data-[state=active]:bg-background">
                Requests
                {mockChatRequests.length > 0 && (
                  <div className="ml-2 h-5 w-5 bg-orange-500 text-white rounded-full text-xs flex items-center justify-center">
                    {mockChatRequests.length}
                  </div>
                )}
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="chats" className="flex-1 overflow-y-auto m-0 px-2">
            <div className="space-y-1 py-2">
              {mockConversations.map((conv) => (
                <div
                  key={conv.id}
                  className={`flex items-center p-3 rounded-xl cursor-pointer transition-all ${
                    selectedChat === conv.id 
                      ? 'bg-primary/10 hover:bg-primary/15' 
                      : 'hover:bg-muted/50'
                  }`}
                  onClick={() => setSelectedChat(conv.id)}
                >
                  <div className="relative">
                    <Avatar className="h-12 w-12 ring-2 ring-background">
                      <AvatarImage src={conv.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${conv.name}`} />
                      <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white">
                        {conv.name.split(' ').map(n => n[0]).join('')}
                      </AvatarFallback>
                    </Avatar>
                    {conv.online && (
                      <div className="absolute bottom-0 right-0 h-3.5 w-3.5 bg-green-500 rounded-full border-2 border-background" />
                    )}
                  </div>
                  
                  <div className="flex-1 ml-3 min-w-0">
                    <div className="flex justify-between items-start">
                      <h3 className="font-semibold truncate">{conv.name}</h3>
                      <span className="text-xs text-muted-foreground ml-2">{conv.time}</span>
                    </div>
                    <div className="flex items-center gap-1 mt-0.5">
                      {conv.unread === 0 && selectedChat !== conv.id && (
                        <CheckCheck className="h-3 w-3 text-blue-500" />
                      )}
                      <p className="text-sm text-muted-foreground truncate">{conv.lastMessage}</p>
                    </div>
                  </div>
                  
                  {conv.unread > 0 && (
                    <div className="ml-2 h-6 w-6 bg-primary text-primary-foreground rounded-full text-xs font-medium flex items-center justify-center">
                      {conv.unread}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="requests" className="flex-1 overflow-y-auto m-0 p-4 space-y-3">
            {mockChatRequests.map((request) => (
              <Card key={request.id} className="p-4 bg-gradient-to-r from-orange-50 to-orange-100/50 dark:from-orange-950/20 dark:to-orange-900/10 border-orange-200 dark:border-orange-800">
                <div className="flex items-start space-x-3">
                  <Avatar className="h-11 w-11 ring-2 ring-orange-200 dark:ring-orange-800">
                    <AvatarImage src={request.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${request.from}`} />
                    <AvatarFallback className="bg-gradient-to-br from-orange-400 to-orange-600 text-white">
                      {request.from.split(' ').map(n => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1">
                    <div className="flex justify-between items-start">
                      <h4 className="font-semibold">{request.from}</h4>
                      <span className="text-xs text-muted-foreground">{request.time}</span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{request.note}</p>
                    
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
            ))}
          </TabsContent>
        </Tabs>
      </div>

      {/* Chat Conversation */}
      {selectedChat ? (
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
                <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=Sophie Turner`} />
                <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white">ST</AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <h3 className="font-semibold">Sophie Turner</h3>
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
              <Button
                size="icon"
                variant="ghost"
                className="h-9 w-9 rounded-full"
              >
                <Video className="h-4 w-4" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="h-9 w-9 rounded-full"
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-muted/20">
            <div className="max-w-3xl mx-auto space-y-3">
              {mockMessages.map((msg, index) => (
                <div
                  key={msg.id}
                  className={`flex items-end gap-2 ${msg.sent ? 'justify-end' : 'justify-start'}`}
                >
                  {!msg.sent && index === 0 && (
                    <Avatar className="h-8 w-8 mb-1">
                      <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=Sophie Turner`} />
                      <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white text-xs">ST</AvatarFallback>
                    </Avatar>
                  )}
                  {!msg.sent && index > 0 && mockMessages[index - 1].sent && (
                    <Avatar className="h-8 w-8 mb-1">
                      <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=Sophie Turner`} />
                      <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white text-xs">ST</AvatarFallback>
                    </Avatar>
                  )}
                  {!msg.sent && index > 0 && !mockMessages[index - 1].sent && (
                    <div className="w-8" />
                  )}
                  
                  <div className={`group relative max-w-[70%] ${msg.sent ? 'items-end' : 'items-start'}`}>
                    <div
                      className={`rounded-2xl px-4 py-2.5 ${
                        msg.sent
                          ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-br-sm'
                          : 'bg-background border rounded-bl-sm shadow-sm'
                      }`}
                    >
                      <p className="text-sm leading-relaxed">{msg.content}</p>
                    </div>
                    <div className={`flex items-center gap-1.5 mt-1 px-1 ${
                      msg.sent ? 'justify-end' : 'justify-start'
                    }`}>
                      <span className="text-xs text-muted-foreground">{msg.time}</span>
                      {msg.sent && (
                        msg.read ? (
                          <CheckCheck className="h-3.5 w-3.5 text-blue-500" />
                        ) : (
                          <Check className="h-3.5 w-3.5 text-muted-foreground" />
                        )
                      )}
                    </div>
                  </div>
                </div>
              ))}
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
                    onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
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
