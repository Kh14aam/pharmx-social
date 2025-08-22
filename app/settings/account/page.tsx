"use client"

import { useState, useEffect } from "react"
// useRouter import removed - not used in this component
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
// Avatar components removed - not used in this component
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { ChevronRight, Camera, User, Loader2 } from "lucide-react"
import Link from "next/link"
import { apiClient } from "@/lib/api-client"

const profileSchema = z.object({
  name: z.string().min(2).max(40),
  gender: z.enum(["male", "female"]),
  dobDay: z.string().regex(/^(0?[1-9]|[12][0-9]|3[01])$/, "Invalid day"),
  dobMonth: z.string().regex(/^(0?[1-9]|1[012])$/, "Invalid month"),
  dobYear: z.string().regex(/^(19|20)\d{2}$/, "Invalid year").refine((year) => {
    const currentYear = new Date().getFullYear()
    const birthYear = parseInt(year)
    return currentYear - birthYear >= 18
  }, "You must be at least 18 years old"),
  bio: z.string().max(160),
  avatarUrl: z.string().optional(),
})

type ProfileFormData = z.infer<typeof profileSchema>

interface UserProfile {
  name: string
  email: string
  gender: string
  dob: string
  bio: string
  avatarUrl: string | null
}

export default function AccountSettingsPage() {
  // const router = useRouter() // Removed - not used in this component
  const { toast } = useToast()
  const [avatarPreview, setAvatarPreview] = useState<string>("")
  const [uploading, setUploading] = useState(false)
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<UserProfile | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setValue,
    watch,
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
  })

  const watchedFields = watch()

  useEffect(() => {
    fetchUserProfile()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const fetchUserProfile = async () => {
    try {
      setLoading(true)
      const data = await apiClient.profile.get()
      
      const profile: UserProfile = {
        name: data.name || data.username || '',
        email: data.email || '',
        gender: data.gender || 'male',
        dob: data.dob || '',
        bio: data.bio || '',
        avatarUrl: data.avatar_url || data.profile_picture_url || null
      }
      
      setUser(profile)
      setAvatarPreview(profile.avatarUrl || '')
      
      // Set form values
      setValue("name", profile.name)
      setValue("gender", profile.gender as "male" | "female")
      setValue("bio", profile.bio)
      setValue("avatarUrl", profile.avatarUrl || "")
      
      // Parse date of birth
      if (profile.dob) {
        const date = new Date(profile.dob)
        setValue("dobDay", date.getDate().toString())
        setValue("dobMonth", (date.getMonth() + 1).toString())
        setValue("dobYear", date.getFullYear().toString())
      }
      
    } catch (error) {
      console.error('Error fetching profile:', error)
      toast({
        title: "Error loading profile",
        description: "Failed to load your profile data",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please select an image under 10MB",
        variant: "destructive",
      })
      return
    }

    // Preview the image locally first
    const reader = new FileReader()
    reader.onloadend = () => {
      setAvatarPreview(reader.result as string)
    }
    reader.readAsDataURL(file)

    setUploading(true)

    try {
      const result = await apiClient.profile.uploadAvatar(file)
      setValue("avatarUrl", result.url)
      
      toast({
        title: "Photo updated",
        description: "Your profile photo has been updated",
      })
    } catch (error) {
      console.error('Upload error:', error)
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "Failed to upload image",
        variant: "destructive",
      })
    } finally {
      setUploading(false)
    }
  }

  const onSubmit = async (data: ProfileFormData) => {
    try {
      // Combine date parts into ISO date string
      const dob = `${data.dobYear}-${data.dobMonth.padStart(2, '0')}-${data.dobDay.padStart(2, '0')}`
      const profileData = {
        name: data.name,
        gender: data.gender,
        dob,
        bio: data.bio,
        avatarUrl: data.avatarUrl,
      }
      
      await apiClient.profile.update(profileData)
      
      toast({
        title: "Profile updated",
        description: "Your profile has been successfully updated",
      })

      // Refresh the profile data
      await fetchUserProfile()
      
    } catch (error) {
      console.error('Profile update error:', error)
      toast({
        title: "Update failed",
        description: error instanceof Error ? error.message : "Failed to update profile",
        variant: "destructive",
      })
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="sticky top-0 bg-background/95 backdrop-blur-sm border-b z-10">
          <div className="flex items-center justify-between px-4 py-3">
            <Link href="/settings" className="p-2 -ml-2">
              <ChevronRight className="h-5 w-5 rotate-180" />
            </Link>
            <h1 className="text-lg font-semibold">Account</h1>
            <div className="w-9" />
          </div>
        </div>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 bg-background/95 backdrop-blur-sm border-b z-10">
        <div className="flex items-center justify-between px-4 py-3">
          <Link href="/settings" className="p-2 -ml-2">
            <ChevronRight className="h-5 w-5 rotate-180" />
          </Link>
          <h1 className="text-lg font-semibold">Account</h1>
          <div className="w-9" />
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Avatar Upload */}
          <div className="flex flex-col items-center space-y-3">
            <div className="relative w-32 h-32 rounded-full overflow-hidden border-4 border-muted">
              {avatarPreview ? (
                <div 
                  className="absolute inset-0 bg-cover bg-center"
                  style={{ 
                    backgroundImage: `url(${avatarPreview})`,
                  }}
                />
              ) : (
                <div className="absolute inset-0 bg-muted flex items-center justify-center">
                  <User className="w-12 h-12 text-muted-foreground" />
                </div>
              )}
              <button
                type="button"
                onClick={() => document.getElementById('avatar')?.click()}
                className="absolute bottom-2 right-2 p-2 bg-primary rounded-full text-primary-foreground"
                disabled={uploading}
              >
                <Camera className="h-4 w-4" />
              </button>
            </div>
            <Input
              id="avatar"
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAvatarUpload}
              disabled={uploading}
            />
            {uploading && (
              <p className="text-sm text-muted-foreground">Uploading...</p>
            )}
          </div>

          {/* Name Input */}
          <div className="space-y-2">
            <Label htmlFor="name">Display Name</Label>
            <Input
              id="name"
              placeholder="Your display name"
              {...register("name")}
            />
            {errors.name && (
              <p className="text-sm text-destructive">{errors.name.message}</p>
            )}
          </div>

          {/* Gender Selection */}
          <div className="space-y-2">
            <Label>Gender</Label>
            <RadioGroup
              onValueChange={(value) => setValue("gender", value as "male" | "female")}
              defaultValue={user?.gender}
              className="flex gap-6"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="male" id="male" />
                <Label htmlFor="male">Male</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="female" id="female" />
                <Label htmlFor="female">Female</Label>
              </div>
            </RadioGroup>
            {errors.gender && (
              <p className="text-sm text-destructive">{errors.gender.message}</p>
            )}
          </div>

          {/* Date of Birth */}
          <div className="space-y-2">
            <Label>Date of Birth</Label>
            <div className="flex gap-2">
              <div className="flex-1">
                <Input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  placeholder="DD"
                  maxLength={2}
                  className="text-center"
                  {...register("dobDay")}
                />
              </div>
              <div className="flex-1">
                <Input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  placeholder="MM"
                  maxLength={2}
                  className="text-center"
                  {...register("dobMonth")}
                />
              </div>
              <div className="flex-[1.5]">
                <Input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  placeholder="YYYY"
                  maxLength={4}
                  className="text-center"
                  {...register("dobYear")}
                />
              </div>
            </div>
            {(errors.dobDay || errors.dobMonth || errors.dobYear) && (
              <p className="text-sm text-destructive">
                {errors.dobDay?.message || errors.dobMonth?.message || errors.dobYear?.message}
              </p>
            )}
          </div>

          {/* Bio */}
          <div className="space-y-2">
            <Label htmlFor="bio">Bio</Label>
            <Textarea
              id="bio"
              placeholder="Tell people about yourself..."
              className="resize-none h-24"
              maxLength={160}
              {...register("bio")}
            />
            <p className="text-xs text-muted-foreground text-right">
              {watchedFields.bio?.length || 0}/160 characters
            </p>
            {errors.bio && (
              <p className="text-sm text-destructive">{errors.bio.message}</p>
            )}
          </div>

          {/* Email (Read-only) */}
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={user?.email || ''}
              disabled
              className="bg-muted"
            />
            <p className="text-xs text-muted-foreground">
              Email cannot be changed
            </p>
          </div>

          {/* Submit Button */}
          <Button 
            type="submit"
            className="w-full"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Updating..." : "Update Profile"}
          </Button>
        </form>
      </div>
    </div>
  )
}
