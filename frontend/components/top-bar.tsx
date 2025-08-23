"use client"

import Link from "next/link"
import { Settings } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function TopBar() {
  return (
    <header className="fixed top-0 left-0 right-0 bg-background/80 backdrop-blur-lg border-b border-border/50 z-50">
      <div className="flex items-center justify-between h-16 px-6 max-w-screen-md mx-auto">
        <Link href="/app/voice" className="group">
          <span className="font-bold text-2xl tracking-tight text-black hover:opacity-80 transition-opacity">
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
