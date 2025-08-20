import { Button } from "@/components/ui/button"
import Link from "next/link"
import { ShaderAnimation } from "@/components/ui/shader-animation"
import { Mic } from "lucide-react"
// import { auth } from "@/auth"
// import { redirect } from "next/navigation"

export default async function Home() {
  // const session = await auth()
  
  // if (session) {
  //   redirect("/app/voice")
  // }

  return (
    <div className="relative w-full h-screen overflow-hidden">
      {/* Shader Animation Background */}
      <ShaderAnimation />
      
      {/* Content Overlay */}
      <div className="absolute inset-0 flex flex-col items-center justify-center z-10">
        <div className="text-center space-y-6">
          {/* Main Title */}
          <h1 className="text-7xl md:text-8xl lg:text-9xl font-bold tracking-tighter text-white">
            PharmX Social
          </h1>
          
          {/* Tagline */}
          <p className="text-2xl md:text-3xl text-white/90">
            Meet new people.
          </p>
          
          {/* Find a Voice Button */}
          <div className="pt-8">
            <Link href="/app/voice">
              <Button 
                size="lg"
                className="bg-white text-black hover:bg-white/90 h-14 px-8 text-lg font-medium rounded-full transition-all hover:scale-105"
              >
                <Mic className="mr-2 h-5 w-5" />
                Find a Voice
              </Button>
            </Link>
          </div>
        </div>
        
        {/* Development Mode Links - Positioned at bottom */}
        <div className="absolute bottom-8 left-0 right-0 px-4">
          <div className="max-w-2xl mx-auto">
            <div className="p-4 bg-black/50 backdrop-blur-sm rounded-xl border border-white/10">
              <p className="text-xs text-center mb-3 text-yellow-300">⚠️ Development Mode</p>
              <div className="flex flex-wrap gap-2 justify-center">
                <Link href="/api/auth/signin/google">
                  <Button size="sm" variant="ghost" className="text-white hover:text-white hover:bg-white/10">
                    🔐 Google Login
                  </Button>
                </Link>
                <Link href="/app/users">
                  <Button size="sm" variant="ghost" className="text-white hover:text-white hover:bg-white/10">
                    👥 Users
                  </Button>
                </Link>
                <Link href="/app/chats">
                  <Button size="sm" variant="ghost" className="text-white hover:text-white hover:bg-white/10">
                    💬 Chats
                  </Button>
                </Link>
                <Link href="/onboarding">
                  <Button size="sm" variant="ghost" className="text-white hover:text-white hover:bg-white/10">
                    ✏️ Onboarding
                  </Button>
                </Link>
                <Link href="/settings">
                  <Button size="sm" variant="ghost" className="text-white hover:text-white hover:bg-white/10">
                    ⚙️ Settings
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
