"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Phone, Send, Check, CheckCheck, Clock, MessageSquare } from "lucide-react"
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
    <div className="h-[calc(100vh-8rem)] flex">
      {/* Chat List - hidden on mobile when chat is selected */}
      <div className={`${isChatSelected ? 'hidden md:flex' : 'flex'} flex-col w-full md:w-96 border-r`}>
        <Tabs defaultValue="chats" className="flex-1 flex flex-col">
          <div className="border-b px-4">
            <TabsList className="grid w-full grid-cols-2 my-2">
              <TabsTrigger value="chats">
                Chats
                {mockConversations.filter(c => c.unread > 0).length > 0 && (
                  <Badge className="ml-2 h-5 px-1" variant="destructive">
                    {mockConversations.reduce((acc, c) => acc + c.unread, 0)}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="requests">
                Requests
                {mockChatRequests.length > 0 && (
                  <Badge className="ml-2 h-5 px-1" variant="secondary">
                    {mockChatRequests.length}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="chats" className="flex-1 overflow-y-auto m-0">
            {mockConversations.map((conv) => (
              <div
                key={conv.id}
                className="flex items-center p-4 hover:bg-muted/50 cursor-pointer border-b"
                onClick={() => setSelectedChat(conv.id)}
              >
                <div className="relative">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={conv.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${conv.name}`} />
                    <AvatarFallback>{conv.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                  </Avatar>
                  {conv.online && (
                    <div className="absolute bottom-0 right-0 h-3 w-3 bg-green-500 rounded-full border-2 border-background" />
                  )}
                </div>
                
                <div className="flex-1 ml-3 min-w-0">
                  <div className="flex justify-between items-baseline">
                    <h3 className="font-semibold truncate">{conv.name}</h3>
                    <span className="text-xs text-muted-foreground">{conv.time}</span>
                  </div>
                  <p className="text-sm text-muted-foreground truncate">{conv.lastMessage}</p>
                </div>
                
                {conv.unread > 0 && (
                  <Badge className="ml-2" variant="default">
                    {conv.unread}
                  </Badge>
                )}
              </div>
            ))}
          </TabsContent>

          <TabsContent value="requests" className="flex-1 overflow-y-auto m-0 p-4 space-y-4">
            {mockChatRequests.map((request) => (
              <Card key={request.id} className="p-4">
                <div className="flex items-start space-x-3">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={request.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${request.from}`} />
                    <AvatarFallback>{request.from.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1">
                    <div className="flex justify-between items-start">
                      <h4 className="font-semibold">{request.from}</h4>
                      <span className="text-xs text-muted-foreground">{request.time}</span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">{request.note}</p>
                    
                    <div className="flex gap-2 mt-3">
                      <Button
                        size="sm"
                        variant="default"
                        onClick={() => handleAcceptRequest(request.id)}
                      >
                        Accept
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
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
        <div className="flex-1 flex flex-col">
          {/* Chat Header */}
          <div className="border-b px-4 py-3 flex items-center justify-between">
            <div className="flex items-center">
              <Button
                variant="ghost"
                size="sm"
                className="md:hidden mr-2"
                onClick={() => setSelectedChat(null)}
              >
                ← Back
              </Button>
              <Avatar className="h-8 w-8 mr-3">
                <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=Sophie Turner`} />
                <AvatarFallback>ST</AvatarFallback>
              </Avatar>
              <div>
                <h3 className="font-semibold">Sophie Turner</h3>
                <p className="text-xs text-green-500">Online</p>
              </div>
            </div>
            <Button
              size="icon"
              variant="ghost"
              onClick={handleCall}
            >
              <Phone className="h-5 w-5" />
            </Button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {mockMessages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.sent ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[70%] rounded-2xl px-4 py-2 ${
                    msg.sent
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted'
                  }`}
                >
                  <p className="text-sm">{msg.content}</p>
                  <div className={`flex items-center justify-end gap-1 mt-1 ${msg.sent ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                    <span className="text-xs">{msg.time}</span>
                    {msg.sent && (
                      msg.read ? (
                        <CheckCheck className="h-3 w-3" />
                      ) : (
                        <Check className="h-3 w-3" />
                      )
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Message Input */}
          <div className="border-t p-4">
            <div className="flex gap-2">
              <Input
                placeholder="Type a message..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                className="flex-1"
              />
              <Button onClick={handleSendMessage}>
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div className="hidden md:flex flex-1 items-center justify-center text-muted-foreground">
          <div className="text-center">
            <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Select a conversation to start chatting</p>
          </div>
        </div>
      )}
    </div>
  )
}
