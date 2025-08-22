"use client"

import { useRouter } from "next/navigation"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { MessageSquare } from "lucide-react"

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

type User = (typeof mockUsers)[number]

export default function UsersPage() {
  const router = useRouter()

  const handleMessage = (user: User, e: React.MouseEvent) => {
    e.stopPropagation()
    const note = prompt(`Send a message to ${user.name}:`)
    if (note && note.trim()) {
      const stored = JSON.parse(localStorage.getItem("chatRequests") || "[]")
      stored.push({
        id: Date.now().toString(),
        from: user.name,
        avatar: user.image,
        note,
        time: "Just now",
      })
      localStorage.setItem("chatRequests", JSON.stringify(stored))
      router.push("/app/chats?tab=requests")
    }
  }

  return (
    <div className="container max-w-6xl mx-auto px-2 sm:px-4 py-4">
      {/* User Grid - Picture Focused */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3">
        {mockUsers.map((user) => (
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

              {/* User Info & Message */}
              <div className="absolute bottom-0 left-0 right-0 p-3 flex items-center justify-between text-white">
                <div className="flex items-center gap-1">
                  <h3 className="font-bold text-lg">{user.name}</h3>
                  <span className="text-lg opacity-90">{user.age}</span>
                </div>
                <Button
                  size="sm"
                  className="h-8 w-8 bg-white/20 backdrop-blur-sm hover:bg-white/30 border-0 text-white"
                  onClick={(e) => handleMessage(user, e)}
                >
                  <MessageSquare className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>

    </div>
  )
}
