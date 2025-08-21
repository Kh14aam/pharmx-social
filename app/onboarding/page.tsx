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
import { useUser } from '@auth0/nextjs-auth0/client'

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
  const { user, error, isLoading: isUserLoading } = useUser()
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
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        <div className="bg-zinc-900 rounded-2xl p-6 md:p-8 border border-zinc-800">
          {/* Header */}
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-white">Complete Your Profile</h1>
            <p className="text-zinc-400 mt-1">All fields are required</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Two column layout for desktop, single column for mobile */}
            <div className="grid md:grid-cols-2 gap-6">
              {/* Left Column */}
              <div className="space-y-4">
                {/* Avatar Upload */}
                <div className="flex flex-col items-center space-y-3">
                  <Avatar className="w-20 h-20 border-2 border-zinc-700">
                    {avatarPreview || user?.picture ? (
                      <AvatarImage src={avatarPreview || user?.picture || ""} />
                    ) : (
                      <AvatarFallback className="bg-zinc-800">
                        <User className="w-8 h-8 text-zinc-400" />
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
                    <Button type="button" variant="outline" size="sm" disabled={uploading} className="text-xs">
                      {uploading ? "Uploading..." : "Upload Photo"}
                    </Button>
                  </Label>
                </div>

                {/* Name Input */}
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-zinc-300 flex items-center gap-2">
                    <User className="w-4 h-4" /> Name
                  </Label>
                  <Input
                    id="name"
                    placeholder="Your display name"
                    className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500"
                    {...register("name")}
                    defaultValue={user?.name || ""}
                  />
                  {errors.name && (
                    <p className="text-sm text-red-400">{errors.name.message}</p>
                  )}
                </div>

                {/* Date of Birth */}
                <div className="space-y-2">
                  <Label htmlFor="dob" className="text-zinc-300 flex items-center gap-2">
                    <Calendar className="w-4 h-4" /> Date of Birth
                  </Label>
                  <Input
                    id="dob"
                    type="date"
                    className="bg-zinc-800 border-zinc-700 text-white"
                    {...register("dob")}
                    max={format(new Date(), "yyyy-MM-dd")}
                  />
                  {errors.dob && (
                    <p className="text-sm text-red-400">{errors.dob.message}</p>
                  )}
                </div>
              </div>

              {/* Right Column */}
              <div className="space-y-4">
                {/* Gender Selection */}
                <div className="space-y-2">
                  <Label className="text-zinc-300">Gender</Label>
                  <RadioGroup
                    onValueChange={(value) => setValue("gender", value as "male" | "female")}
                    className="flex gap-4"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="male" id="male" className="border-zinc-600" />
                      <Label htmlFor="male" className="text-zinc-300 cursor-pointer">Male</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="female" id="female" className="border-zinc-600" />
                      <Label htmlFor="female" className="text-zinc-300 cursor-pointer">Female</Label>
                    </div>
                  </RadioGroup>
                  <p className="text-xs text-zinc-500 flex items-center gap-1">
                    <Info className="w-3 h-3" /> Cannot be changed later
                  </p>
                  {errors.gender && (
                    <p className="text-sm text-red-400">{errors.gender.message}</p>
                  )}
                </div>

                {/* Bio */}
                <div className="space-y-2">
                  <Label htmlFor="bio" className="text-zinc-300">Bio</Label>
                  <Textarea
                    id="bio"
                    placeholder="Tell us about yourself..."
                    className="resize-none h-[120px] bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500"
                    maxLength={160}
                    {...register("bio")}
                  />
                  <p className="text-xs text-zinc-500 text-right">
                    {watchedFields.bio?.length || 0}/160 characters
                  </p>
                  {errors.bio && (
                    <p className="text-sm text-red-400">{errors.bio.message}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <Button 
              type="submit"
              className="w-full bg-white text-black hover:bg-zinc-200 font-medium"
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
