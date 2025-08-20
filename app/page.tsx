import { Button } from "@/components/ui/button"
import Link from "next/link"
// import { auth } from "@/auth"
// import { redirect } from "next/navigation"

export default async function Home() {
  // const session = await auth()
  
  // if (session) {
  //   redirect("/app/voice")
  // }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 bg-gradient-to-b from-background to-muted/20">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold tracking-tight">
            PharmX Voice Social
          </h1>
          <p className="text-2xl text-muted-foreground">
            Meet new people. Be social.
          </p>
        </div>

        <div className="bg-card rounded-2xl p-8 shadow-lg border space-y-4">
          <form action="/api/auth/signin/google" method="POST">
            <Button 
              type="submit"
              className="w-full h-12 text-base font-medium rounded-xl"
              variant="default"
            >
              <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Continue with Google
            </Button>
          </form>

          <form action="/api/auth/signin/apple" method="POST">
            <Button 
              type="submit"
              className="w-full h-12 text-base font-medium rounded-xl"
              variant="outline"
            >
              <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.53 4.09l-.05-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
              </svg>
              Continue with Apple
            </Button>
          </form>
        </div>

        <div className="text-center space-y-2">
          <div className="flex justify-center space-x-6 text-sm text-muted-foreground">
            <Link href="/legal/terms" className="hover:underline">
              Terms
            </Link>
            <Link href="/legal/privacy" className="hover:underline">
              Privacy
            </Link>
            <Link href="/legal/guidelines" className="hover:underline">
              Community Guidelines
            </Link>
          </div>
        </div>

        {/* Temporary bypass for development */}
        <div className="mt-8 p-4 bg-yellow-100 dark:bg-yellow-900/20 rounded-xl border border-yellow-300 dark:border-yellow-700">
          <p className="text-xs text-center mb-2 text-yellow-800 dark:text-yellow-200">⚠️ Development Mode - Skip Auth</p>
          <div className="flex flex-wrap gap-2 justify-center">
            <Link href="/app/voice">
              <Button size="sm" variant="secondary">
                📞 Voice Tab
              </Button>
            </Link>
            <Link href="/app/users">
              <Button size="sm" variant="secondary">
                👥 Users Tab
              </Button>
            </Link>
            <Link href="/app/chats">
              <Button size="sm" variant="secondary">
                💬 Chats Tab
              </Button>
            </Link>
            <Link href="/onboarding">
              <Button size="sm" variant="secondary">
                ✏️ Onboarding
              </Button>
            </Link>
            <Link href="/settings">
              <Button size="sm" variant="secondary">
                ⚙️ Settings
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
