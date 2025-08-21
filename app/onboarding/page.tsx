"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { format } from "date-fns"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { User, Calendar, Info } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useUser } from '@/components/providers/session-provider'

const profileSchema = z.object({
  name: z.string().min(2).max(40),
  gender: z.enum(["male", "female"]),
  dob: z.string().refine((date) => {
    const age = new Date().getFullYear() - new Date(date).getFullYear()
    return age >= 18
  }, "You must be at least 18 years old"),
  bio: z.string().max(160),
  avatarUrl: z.string().url().optional(),
})

type ProfileFormData = z.infer<typeof profileSchema>

export default function OnboardingPage() {
  const router = useRouter()
  const { toast } = useToast()
  const { user } = useUser()
  const [avatarPreview, setAvatarPreview] = useState<string>("")
  const [uploading, setUploading] = useState(false)

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

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please select an image under 5MB",
        variant: "destructive",
      })
      return
    }

    setUploading(true)
    const formData = new FormData()
    formData.append("file", file)

    try {
      const response = await fetch("/api/upload/avatar", {
        method: "POST",
        body: formData,
      })

      if (!response.ok) throw new Error("Upload failed")

      const { url } = await response.json()
      setAvatarPreview(url)
      setValue("avatarUrl", url)
    } catch {
      toast({
        title: "Upload failed",
        description: "Please try again",
        variant: "destructive",
      })
    } finally {
      setUploading(false)
    }
  }

  const onSubmit = async (data: ProfileFormData) => {
    try {
      const response = await fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })

      if (!response.ok) throw new Error("Failed to create profile")

      toast({
        title: "Welcome to PharmX Voice Social!",
        description: "Your profile has been created",
      })

      router.push("/app/voice")
    } catch {
      toast({
        title: "Error",
        description: "Failed to create profile. Please try again.",
        variant: "destructive",
      })
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Complete Your Profile</h1>
            <p className="text-gray-500 mt-2">All fields are required</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Avatar Upload - Centered */}
            <div className="flex flex-col items-center space-y-3">
              <Avatar className="w-24 h-24 border-4 border-gray-200">
                {avatarPreview || user?.picture ? (
                  <AvatarImage src={avatarPreview || user?.picture || ""} />
                ) : (
                  <AvatarFallback className="bg-gray-100">
                    <User className="w-10 h-10 text-gray-400" />
                  </AvatarFallback>
                )}
              </Avatar>
              <Label htmlFor="avatar" className="cursor-pointer">
                <Input
                  id="avatar"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarUpload}
                  disabled={uploading}
                />
                <Button type="button" variant="outline" size="sm" disabled={uploading}>
                  {uploading ? "Uploading..." : "Upload Photo"}
                </Button>
              </Label>
            </div>

            {/* Name Input */}
            <div className="space-y-2">
              <Label htmlFor="name" className="text-gray-700 font-medium flex items-center gap-2">
                <User className="w-4 h-4" /> Name
              </Label>
              <Input
                id="name"
                placeholder="Your display name"
                className="w-full border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                {...register("name")}
                defaultValue={user?.name || ""}
              />
              {errors.name && (
                <p className="text-sm text-red-500">{errors.name.message}</p>
              )}
            </div>

            {/* Gender Selection */}
            <div className="space-y-2">
              <Label className="text-gray-700 font-medium">Gender</Label>
              <RadioGroup
                onValueChange={(value) => setValue("gender", value as "male" | "female")}
                className="flex gap-6"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="male" id="male" className="text-blue-600" />
                  <Label htmlFor="male" className="text-gray-700 cursor-pointer">Male</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="female" id="female" className="text-blue-600" />
                  <Label htmlFor="female" className="text-gray-700 cursor-pointer">Female</Label>
                </div>
              </RadioGroup>
              <p className="text-xs text-gray-500 flex items-center gap-1">
                <Info className="w-3 h-3" /> Cannot be changed later
              </p>
              {errors.gender && (
                <p className="text-sm text-red-500">{errors.gender.message}</p>
              )}
            </div>

            {/* Date of Birth */}
            <div className="space-y-2">
              <Label htmlFor="dob" className="text-gray-700 font-medium flex items-center gap-2">
                <Calendar className="w-4 h-4" /> Date of Birth
              </Label>
              <Input
                id="dob"
                type="date"
                className="w-full border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                {...register("dob")}
                max={format(new Date(), "yyyy-MM-dd")}
              />
              {errors.dob && (
                <p className="text-sm text-red-500">{errors.dob.message}</p>
              )}
            </div>

            {/* Bio */}
            <div className="space-y-2">
              <Label htmlFor="bio" className="text-gray-700 font-medium">Bio</Label>
              <Textarea
                id="bio"
                placeholder="Tell us about yourself..."
                className="resize-none h-24 w-full border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                maxLength={160}
                {...register("bio")}
              />
              <p className="text-xs text-gray-500 text-right">
                {watchedFields.bio?.length || 0}/160 characters
              </p>
              {errors.bio && (
                <p className="text-sm text-red-500">{errors.bio.message}</p>
              )}
            </div>

            {/* Submit Button */}
            <Button 
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg transition-colors"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Creating Profile..." : "Complete Setup"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}
