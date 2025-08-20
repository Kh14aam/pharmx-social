"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { MessageSquare, Phone, Heart, X, MapPin, Briefcase, GraduationCap, Music, Camera, Coffee } from "lucide-react"

// Mock data with single profile images
const mockUsers = [
  {
    id: "1",
    name: "Sarah",
    age: 28,
    bio: "Love hiking and coffee. Always up for a good conversation!",
    location: "London",
    occupation: "Product Designer",
    image: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&h=600&fit=crop",
    interests: ["Hiking", "Coffee", "Design", "Travel"],
    verified: true
  },
  {
    id: "2", 
    name: "Mike",
    age: 32,
    bio: "Tech enthusiast, foodie, and amateur photographer.",
    location: "Manchester",
    occupation: "Software Engineer",
    image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=600&fit=crop",
    interests: ["Tech", "Photography", "Food", "Gaming"],
    verified: true
  },
  {
    id: "3",
    name: "Emma",
    age: 25,
    bio: "Yoga instructor. Spreading positivity one breath at a time.",
    location: "Brighton",
    occupation: "Yoga Instructor",
    image: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400&h=600&fit=crop",
    interests: ["Yoga", "Meditation", "Health", "Nature"],
    verified: false
  },
  {
    id: "4",
    name: "James",
    age: 30,
    bio: "Music lover, book worm, and weekend chef.",
    location: "Edinburgh",
    occupation: "Marketing Manager",
    image: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400&h=600&fit=crop",
    interests: ["Music", "Books", "Cooking", "Wine"],
    verified: true
  },
  {
    id: "5",
    name: "Olivia",
    age: 27,
    bio: "Travel addict. 30 countries and counting!",
    location: "Bristol",
    occupation: "Travel Blogger",
    image: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=400&h=600&fit=crop",
    interests: ["Travel", "Photography", "Culture", "Adventure"],
    verified: true
  },
  {
    id: "6",
    name: "David",
    age: 29,
    bio: "Fitness coach helping you reach your goals.",
    location: "Leeds",
    occupation: "Personal Trainer",
    image: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=400&h=600&fit=crop",
    interests: ["Fitness", "Nutrition", "Sports", "Outdoors"],
    verified: false
  }
]

export default function UsersPage() {
  const [likedUsers, setLikedUsers] = useState<Set<string>>(new Set())

  const handleMessage = (userId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    alert("💳 Membership Required\n\nUpgrade to PharmX Premium for £5/month to message users directly.")
  }

  const handleCall = (userId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    alert("💳 Membership Required\n\nUpgrade to PharmX Premium for £5/month to call users directly.")
  }

  const handleLike = (userId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setLikedUsers(prev => {
      const newSet = new Set(prev)
      if (newSet.has(userId)) {
        newSet.delete(userId)
      } else {
        newSet.add(userId)
      }
      return newSet
    })
  }

  return (
    <div className="container max-w-6xl mx-auto px-2 sm:px-4 py-4">
      {/* Header */}
      <div className="mb-4 px-2">
        <h1 className="text-2xl font-bold">Discover</h1>
        <p className="text-sm text-muted-foreground">
          Find people nearby to connect with
        </p>
      </div>

      {/* User Grid - Picture Focused */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3">
        {mockUsers.map((user) => {
          const isLiked = likedUsers.has(user.id)
          
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
                    backgroundImage: `url(${user.image})`,
                  }}
                >
                  {/* Gradient Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/80" />
                </div>

                {/* Verified Badge */}
                {user.verified && (
                  <div className="absolute top-2 right-2">
                    <div className="bg-blue-500 text-white p-1 rounded-full">
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                  </div>
                )}

                {/* Like Button */}
                <button
                  onClick={(e) => handleLike(user.id, e)}
                  className="absolute top-2 left-2 p-2 rounded-full bg-white/10 backdrop-blur-sm hover:bg-white/20 transition-colors"
                >
                  <Heart 
                    className={`w-5 h-5 transition-colors ${
                      isLiked ? 'fill-red-500 text-red-500' : 'text-white'
                    }`} 
                  />
                </button>

                {/* User Info Overlay */}
                <div className="absolute bottom-0 left-0 right-0 p-3 text-white">
                  <div className="flex items-center gap-1 mb-1">
                    <h3 className="font-bold text-lg">{user.name}</h3>
                    <span className="text-sm opacity-90">{user.age}</span>
                  </div>
                  
                  <div className="flex items-center gap-1 text-xs mb-2 opacity-90">
                    <MapPin className="w-3 h-3" />
                    <span>{user.location}</span>
                  </div>

                  <p className="text-xs line-clamp-2 opacity-90 mb-3">
                    {user.bio}
                  </p>

                  {/* Action Buttons */}
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      className="flex-1 h-8 bg-white/20 backdrop-blur-sm hover:bg-white/30 border-0 text-white"
                      onClick={(e) => handleMessage(user.id, e)}
                    >
                      <MessageSquare className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="sm"
                      className="flex-1 h-8 bg-primary hover:bg-primary/90 border-0"
                      onClick={(e) => handleCall(user.id, e)}
                    >
                      <Phone className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          )
        })}
      </div>

      {/* Premium Prompt - More Subtle */}
      <div className="mt-8 mx-2">
        <Card className="bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
          <div className="p-4 sm:p-6 text-center">
            <h3 className="text-base sm:text-lg font-semibold mb-2">
              Unlock Unlimited Connections
            </h3>
            <p className="text-xs sm:text-sm text-muted-foreground mb-4">
              Message and call anyone directly for £5/month
            </p>
            <Button size="sm" className="bg-primary hover:bg-primary/90">
              Get Premium
            </Button>
          </div>
        </Card>
      </div>
    </div>
  )
}
