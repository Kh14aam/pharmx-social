import { Button } from "@/components/ui/button"
import Link from "next/link"
import dynamic from "next/dynamic"
import { Mic } from "lucide-react"

const ShaderAnimation = dynamic(
  () => import("@/components/ui/shader-animation").then(mod => mod.ShaderAnimation),
  { 
    ssr: false,
    loading: () => <div className="w-full h-screen bg-black" />
  }
)

export default function Home() {
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
            <Link href="/login">
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
      </div>
    </div>
  )
}
