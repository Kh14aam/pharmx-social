import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/db"
import { z } from "zod"

const profileSchema = z.object({
  name: z.string().min(2).max(40),
  gender: z.enum(["male", "female"]),
  dob: z.string().transform((str) => new Date(str)),
  bio: z.string().max(160),
  avatarUrl: z.string().url().optional(),
})

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    
    const body = await req.json()
    const data = profileSchema.parse(body)
    
    // Check if user is at least 18 years old
    const age = new Date().getFullYear() - data.dob.getFullYear()
    if (age < 18) {
      return NextResponse.json(
        { error: "You must be at least 18 years old" },
        { status: 400 }
      )
    }
    
    // Check if profile already exists
    const existingProfile = await prisma.profile.findUnique({
      where: { userId: session.user.id },
    })
    
    if (existingProfile) {
      // Update profile (but not gender if it's locked)
      const updateData: {
        name: string
        bio: string
        dob: Date
        avatarUrl?: string
        gender?: "male" | "female"
        genderLocked?: boolean
      } = {
        name: data.name,
        bio: data.bio,
        dob: data.dob,
      }
      
      if (data.avatarUrl) {
        updateData.avatarUrl = data.avatarUrl
      }
      
      // Only allow gender update if not locked
      if (!existingProfile.genderLocked) {
        updateData.gender = data.gender
        updateData.genderLocked = true
      }
      
      const profile = await prisma.profile.update({
        where: { userId: session.user.id },
        data: updateData,
      })
      
      return NextResponse.json(profile)
    } else {
      // Create new profile
      const profile = await prisma.profile.create({
        data: {
          userId: session.user.id,
          name: data.name,
          gender: data.gender,
          genderLocked: true,
          dob: data.dob,
          bio: data.bio,
          avatarUrl: data.avatarUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${data.name}`,
        },
      })
      
      return NextResponse.json(profile)
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid data", details: error.issues },
        { status: 400 }
      )
    }
    
    console.error("Profile creation error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function GET() {
  try {
    const session = await auth()
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    
    const profile = await prisma.profile.findUnique({
      where: { userId: session.user.id },
      include: { user: true },
    })
    
    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 })
    }
    
    return NextResponse.json(profile)
  } catch (error) {
    console.error("Profile fetch error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
