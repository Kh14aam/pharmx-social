// import { auth } from "@/auth"
// import { redirect } from "next/navigation"
import BottomNav from "@/components/bottom-nav"
import TopBar from "@/components/top-bar"

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // const session = await auth()

  // if (!session) {
  //   redirect("/")
  // }

  return (
    <div className="min-h-screen flex flex-col">
      <TopBar />
      <main className="flex-1 pb-16 pt-16">
        {children}
      </main>
      <BottomNav />
    </div>
  )
}
