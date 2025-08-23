"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Phone, Users, MessageSquare } from "lucide-react"
import { cn } from "@/lib/utils"

const navItems = [
  {
    href: "/app/voice",
    label: "Voice",
    icon: Phone,
  },
  {
    href: "/app/users",
    label: "Users",
    icon: Users,
  },
  {
    href: "/app/chats",
    label: "Chats",
    icon: MessageSquare,
  },
]

export default function BottomNav() {
  const pathname = usePathname()

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-background border-t">
      <nav className="flex justify-around items-center h-16 max-w-md mx-auto">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href
          
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center flex-1 h-full py-2 transition-colors",
                isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className="h-5 w-5 mb-1" />
              <span className="text-xs font-medium">{item.label}</span>
            </Link>
          )
        })}
      </nav>
    </div>
  )
}
