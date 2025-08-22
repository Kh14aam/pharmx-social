"use client"

import { useRouter } from "next/navigation"
import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { Info, User, ChevronRight } from "lucide-react"
import Link from "next/link"
import { apiClient } from "@/lib/api-client"

const withApiBase = (url?: string | null) => {
  if (!url) return ""
  if (url.startsWith("http")) return url
  const base = process.env.NEXT_PUBLIC_API_URL || ""
  return `${base}${url}`
}

const profileSchema = z.object({
  name: z.string().min(2).max(40),
  gender: z.enum(["male", "female"]),
  dobDay: z.string().regex(/^(0?[1-9]|[12][0-9]|3[01])$/, "Invalid day"),
  dobMonth: z.string().regex(/^(0?[1-9]|1[012])$/, "Invalid month"),
  dobYear: z
    .string()
    .regex(/^(19|20)\d{2}$/, "Invalid year")
    .refine((year) => {
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
  const router = useRouter()
  const { toast } = useToast()
  const [avatarPreview, setAvatarPreview] = useState("")
  const [uploading, setUploading] = useState(false)
  const [dobDay, setDobDay] = useState("")
  const [dobMonth, setDobMonth] = useState("")
  const [dobYear, setDobYear] = useState("")

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
      const data = await apiClient.profile.get()

      const profile: UserProfile = {
        name: data.name || data.username || "",
        email: data.email || "",
        gender: data.gender || "male",
        dob: data.dob || "",
        bio: data.bio || "",
        avatarUrl: data.avatar_url || data.profile_picture_url || null,
      }

      setAvatarPreview(withApiBase(profile.avatarUrl))
      setValue("name", profile.name)
      setValue("gender", profile.gender as "male" | "female")
      setValue("bio", profile.bio)
      setValue("avatarUrl", profile.avatarUrl || "")

      if (profile.dob) {
        const date = new Date(profile.dob)
        const day = date.getDate().toString().padStart(2, "0")
        const month = (date.getMonth() + 1).toString().padStart(2, "0")
        const year = date.getFullYear().toString()
        setDobDay(day)
        setDobMonth(month)
        setDobYear(year)
        setValue("dobDay", day)
        setValue("dobMonth", month)
        setValue("dobYear", year)
      }
    } catch (error) {
      console.error("Error fetching profile:", error)
      toast({
        title: "Error loading profile",
        description: "Failed to load your profile data",
        variant: "destructive",
      })
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

    const reader = new FileReader()
    reader.onloadend = () => {
      setAvatarPreview(reader.result as string)
    }
    reader.readAsDataURL(file)

    setUploading(true)
    try {
      const result = await apiClient.profile.uploadAvatar(file)
      setValue("avatarUrl", result.url)
      setAvatarPreview(withApiBase(result.url))

      toast({
        title: "Photo updated",
        description: "Your profile photo has been updated",
      })
    } catch (error) {
      console.error("Upload error:", error)
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
      const dob = `${data.dobYear}-${data.dobMonth.padStart(2, "0")}-${data.dobDay.padStart(2, "0")}`
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

      await fetchUserProfile()
    } catch (error) {
      console.error("Profile update error:", error)
      toast({
        title: "Update failed",
        description: error instanceof Error ? error.message : "Failed to update profile",
        variant: "destructive",
      })
    }
  }

  const handleDeleteAccount = async () => {
    if (!window.confirm("Are you sure you want to delete your account? This action cannot be undone.")) {
      return
    }

    try {
      await apiClient.profile.delete()
      apiClient.clearAuth()

      toast({
        title: "Account deleted",
        description: "Your account has been removed",
      })

      router.push("/login")
    } catch (error) {
      console.error("Delete account error:", error)
      toast({
        title: "Deletion failed",
        description: error instanceof Error ? error.message : "Failed to delete account",
        variant: "destructive",
      })
    }
  }

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

      <div className="flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="bg-white dark:bg-card rounded-2xl shadow-xl p-8">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {/* Avatar Upload */}
              <div className="flex flex-col items-center space-y-3">
                <div className="relative w-48 h-48 rounded-lg overflow-hidden border-4 border-gray-200">
                  {avatarPreview ? (
                    <div
                      className="absolute inset-0 bg-cover bg-center"
                      style={{ backgroundImage: `url(${avatarPreview})` }}
                    />
                  ) : (
                    <div className="absolute inset-0 bg-gray-100 flex items-center justify-center">
                      <User className="w-16 h-16 text-gray-400" />
                    </div>
                  )}
                </div>
                <div>
                  <Input
                    id="avatar"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleAvatarUpload}
                    disabled={uploading}
                  />
                  <Label htmlFor="avatar" className="cursor-pointer inline-block">
                    <div className="bg-white hover:bg-gray-100 text-black border border-gray-300 px-4 py-2 rounded-md text-sm font-medium transition-colors">
                      {uploading ? "Uploading..." : "Upload Photo"}
                    </div>
                  </Label>
                </div>
              </div>

              {/* Name Input */}
              <div className="space-y-2">
                <Label htmlFor="name" className="text-gray-700 font-medium">
                  Name
                </Label>
                <Input
                  id="name"
                  placeholder="Your display name"
                  className="w-full border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                  {...register("name")}
                />
                {errors.name && <p className="text-sm text-red-500">{errors.name.message}</p>}
              </div>

              {/* Gender (read-only) */}
              <div className="space-y-2">
                <Label className="text-gray-700 font-medium">Gender</Label>
                <RadioGroup value={watch("gender")} className="flex gap-6">
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="male" id="male" disabled className="text-black border-gray-400" />
                    <Label htmlFor="male" className="text-gray-700">
                      Male
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="female" id="female" disabled className="text-black border-gray-400" />
                    <Label htmlFor="female" className="text-gray-700">
                      Female
                    </Label>
                  </div>
                </RadioGroup>
                <p className="text-xs text-gray-500 flex items-center gap-1">
                  <Info className="w-3 h-3" /> Cannot be changed
                </p>
              </div>

              {/* Date of Birth */}
              <div className="space-y-2">
                <Label className="text-gray-700 font-medium">Date of Birth</Label>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <Input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      placeholder="DD"
                      maxLength={2}
                      className="w-full text-center border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                      {...register("dobDay")}
                      onChange={(e) => {
                        const value = e.target.value.replace(/\D/g, "")
                        setDobDay(value)
                        setValue("dobDay", value)
                        if (value.length === 2) {
                          const monthInput = document.querySelector('input[name="dobMonth"]') as HTMLInputElement
                          monthInput?.focus()
                        }
                      }}
                      value={dobDay}
                    />
                  </div>
                  <div className="flex-1">
                    <Input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      placeholder="MM"
                      maxLength={2}
                      className="w-full text-center border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                      {...register("dobMonth")}
                      onChange={(e) => {
                        const value = e.target.value.replace(/\D/g, "")
                        setDobMonth(value)
                        setValue("dobMonth", value)
                        if (value.length === 2) {
                          const yearInput = document.querySelector('input[name="dobYear"]') as HTMLInputElement
                          yearInput?.focus()
                        }
                      }}
                      value={dobMonth}
                    />
                  </div>
                  <div className="flex-[1.5]">
                    <Input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      placeholder="YYYY"
                      maxLength={4}
                      className="w-full text-center border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                      {...register("dobYear")}
                      onChange={(e) => {
                        const value = e.target.value.replace(/\D/g, "")
                        setDobYear(value)
                        setValue("dobYear", value)
                      }}
                      value={dobYear}
                    />
                  </div>
                </div>
                <p className="text-xs text-gray-500">You must be 18 or older</p>
                {(errors.dobDay || errors.dobMonth || errors.dobYear) && (
                  <p className="text-sm text-red-500">
                    {errors.dobDay?.message || errors.dobMonth?.message || errors.dobYear?.message}
                  </p>
                )}
              </div>

              {/* Bio */}
              <div className="space-y-2">
                <Label htmlFor="bio" className="text-gray-700 font-medium">
                  Bio
                </Label>
                <Textarea
                  id="bio"
                  placeholder="Tell us about yourself..."
                  className="resize-none h-24 w-full border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                  maxLength={160}
                  {...register("bio")}
                />
                <p className="text-xs text-gray-500 text-right">{watchedFields.bio?.length || 0}/160 characters</p>
                {errors.bio && <p className="text-sm text-red-500">{errors.bio.message}</p>}
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                className="w-full bg-black hover:bg-gray-900 text-white font-semibold py-3 rounded-lg transition-colors"
                disabled={isSubmitting}
              >
                {isSubmitting ? "Updating..." : "Update Profile"}
              </Button>

              {/* Delete Account Button */}
              <Button
                type="button"
                variant="destructive"
                className="w-full"
                onClick={handleDeleteAccount}
              >
                Delete Account
              </Button>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
