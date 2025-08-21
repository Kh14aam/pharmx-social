import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"

export const runtime = 'edge'

const profileSchema = z.object({
  name: z.string().min(2).max(40),
  gender: z.enum(["male", "female"]),
  dob: z.string().transform((str) => new Date(str)),
  bio: z.string().max(160),
  avatarUrl: z.string().url().optional(),
})

export async function POST(req: NextRequest) {
  try {
    // TODO: Implement Auth0 session validation when configured
    // For now, return placeholder response
    
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
    
    // TODO: Implement D1 database operations when configured
    // Placeholder response
    return NextResponse.json({
      id: crypto.randomUUID(),
      name: data.name,
      gender: data.gender,
      bio: data.bio,
      dob: data.dob.toISOString(),
      avatarUrl: data.avatarUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${data.name}`,
    })
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
    // TODO: Implement Auth0 session validation when configured
    // TODO: Implement D1 database operations when configured
    
    // Placeholder response
    return NextResponse.json({ 
      error: "Profile API not yet configured. Please set up Auth0 and D1 database." 
    }, { status: 503 })
  } catch (error) {
    console.error("Profile fetch error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
