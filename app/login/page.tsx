'use client'

import { Button } from "@/components/ui/button"
import { useEffect, useState } from "react"

export default function LoginPage() {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const handleGoogleLogin = () => {
    // TODO: Implement actual Google OAuth flow
    // For now, this will redirect to onboarding
    window.location.href = '/onboarding'
  }

  if (!mounted) {
    return null
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-black">
      {/* Animated Gradient Background */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-600 via-pink-500 to-blue-500 opacity-80 animate-gradient-xy"></div>
        <div className="absolute inset-0 bg-gradient-to-tr from-blue-600 via-purple-500 to-pink-500 opacity-50 animate-gradient-xy animation-delay-2000"></div>
        <div className="absolute inset-0 bg-gradient-to-bl from-pink-600 via-blue-500 to-purple-500 opacity-30 animate-gradient-xy animation-delay-4000"></div>
      </div>

      {/* Floating Elements Animation */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob"></div>
        <div className="absolute top-1/3 right-1/4 w-64 h-64 bg-pink-500 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-2000"></div>
        <div className="absolute bottom-1/4 left-1/3 w-64 h-64 bg-blue-500 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-4000"></div>
      </div>

      {/* Content Container */}
      <div className="relative z-10 flex flex-col items-center justify-between min-h-screen p-8">
        {/* Header */}
        <div className="text-center pt-12">
          <h1 className="text-5xl md:text-6xl font-bold text-white mb-2">
            PharmX Social
          </h1>
          <p className="text-xl text-white/80">
            Meet new people
          </p>
        </div>

        {/* Center Content - Meeting People Illustration */}
        <div className="flex-1 flex flex-col items-center justify-center max-w-md w-full">
          <div className="bg-white/10 backdrop-blur-md rounded-3xl p-8 border border-white/20 shadow-2xl">
            {/* Animated Icons representing people connecting */}
            <div className="relative w-64 h-64 mx-auto mb-8">
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="relative w-full h-full">
                  {/* Central hub */}
                  <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-16 h-16 bg-white rounded-full shadow-lg flex items-center justify-center">
                    <svg className="w-8 h-8 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M10 12a2 2 0 100-4 2 2 0 000 4z"/>
                      <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd"/>
                    </svg>
                  </div>
                  
                  {/* Orbiting people icons */}
                  <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-12 h-12 bg-gradient-to-br from-purple-400 to-pink-400 rounded-full shadow-lg animate-orbit flex items-center justify-center">
                    <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd"/>
                    </svg>
                  </div>
                  
                  <div className="absolute bottom-0 right-0 w-12 h-12 bg-gradient-to-br from-blue-400 to-purple-400 rounded-full shadow-lg animate-orbit-reverse flex items-center justify-center">
                    <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd"/>
                    </svg>
                  </div>
                  
                  <div className="absolute top-1/2 right-0 transform -translate-y-1/2 w-12 h-12 bg-gradient-to-br from-pink-400 to-purple-400 rounded-full shadow-lg animate-orbit-delayed flex items-center justify-center">
                    <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd"/>
                    </svg>
                  </div>
                  
                  <div className="absolute bottom-0 left-0 w-12 h-12 bg-gradient-to-br from-purple-400 to-blue-400 rounded-full shadow-lg animate-orbit flex items-center justify-center">
                    <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd"/>
                    </svg>
                  </div>
                </div>
              </div>
            </div>

            <div className="text-center mb-6">
              <h2 className="text-2xl font-semibold text-white mb-2">
                Connect with voices worldwide
              </h2>
              <p className="text-white/70">
                Join conversations and make new friends
              </p>
            </div>
          </div>
        </div>

        {/* Bottom Section - Login Button */}
        <div className="w-full max-w-sm">
          <Button 
            onClick={handleGoogleLogin}
            className="w-full h-14 bg-white text-gray-800 hover:bg-gray-100 rounded-full font-medium text-lg shadow-xl hover:shadow-2xl transition-all hover:scale-105 flex items-center justify-center gap-3"
          >
            <svg className="w-6 h-6" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Continue with Google
          </Button>
          
          <p className="text-center text-white/60 text-sm mt-6">
            By continuing, you agree to our Terms of Service and Privacy Policy
          </p>
        </div>
      </div>

      <style jsx>{`
        @keyframes gradient-xy {
          0%, 100% {
            transform: translateX(0) translateY(0);
          }
          33% {
            transform: translateX(30px) translateY(-30px);
          }
          66% {
            transform: translateX(-20px) translateY(20px);
          }
        }
        
        @keyframes blob {
          0% {
            transform: translate(0px, 0px) scale(1);
          }
          33% {
            transform: translate(30px, -50px) scale(1.1);
          }
          66% {
            transform: translate(-20px, 20px) scale(0.9);
          }
          100% {
            transform: translate(0px, 0px) scale(1);
          }
        }
        
        @keyframes orbit {
          from {
            transform: rotate(0deg) translateX(100px) rotate(0deg);
          }
          to {
            transform: rotate(360deg) translateX(100px) rotate(-360deg);
          }
        }
        
        @keyframes orbit-reverse {
          from {
            transform: rotate(0deg) translateX(100px) rotate(0deg);
          }
          to {
            transform: rotate(-360deg) translateX(100px) rotate(360deg);
          }
        }
        
        @keyframes orbit-delayed {
          from {
            transform: rotate(120deg) translateX(100px) rotate(-120deg);
          }
          to {
            transform: rotate(480deg) translateX(100px) rotate(-480deg);
          }
        }
        
        .animate-gradient-xy {
          animation: gradient-xy 15s ease infinite;
        }
        
        .animate-blob {
          animation: blob 7s infinite;
        }
        
        .animate-orbit {
          animation: orbit 20s linear infinite;
        }
        
        .animate-orbit-reverse {
          animation: orbit-reverse 25s linear infinite;
        }
        
        .animate-orbit-delayed {
          animation: orbit-delayed 30s linear infinite;
        }
        
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        
        .animation-delay-4000 {
          animation-delay: 4s;
        }
      `}</style>
    </div>
  )
}
