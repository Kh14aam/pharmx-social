"use client"

import Link from "next/link"
import { Settings, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function TopBar() {
  return (
    <header className="fixed top-0 left-0 right-0 bg-background/80 backdrop-blur-lg border-b border-border/50 z-50">
      <div className="flex items-center justify-between h-16 px-6 max-w-screen-md mx-auto">
        <Link href="/app/voice" className="flex items-center gap-2 group">
          <div className="bg-gradient-to-br from-blue-500 to-purple-600 p-2 rounded-xl shadow-lg transition-transform group-hover:scale-105">
            <Sparkles className="h-5 w-5 text-white" />
          </div>
          <span className="font-bold text-xl tracking-tight bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            PharmX
          </span>
        </Link>
        <Link href="/settings">
          <Button 
            size="icon" 
            variant="ghost" 
            className="rounded-full hover:bg-muted/80 transition-all hover:scale-105"
          >
            <Settings className="h-5 w-5" />
          </Button>
        </Link>
      </div>
    </header>
  )
}
