"use client"

import Link from "next/link"
import { Settings } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function TopBar() {
  return (
    <header className="fixed top-0 left-0 right-0 bg-background border-b z-50">
      <div className="flex items-center justify-between h-14 px-4 max-w-md mx-auto">
        <Link href="/app/voice" className="font-semibold text-lg">
          PharmX Voice
        </Link>
        <Link href="/settings">
          <Button size="icon" variant="ghost">
            <Settings className="h-5 w-5" />
          </Button>
        </Link>
      </div>
    </header>
  )
}
