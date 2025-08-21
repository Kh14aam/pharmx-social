"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
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

export default function OnboardingPage() {
  const router = useRouter()
  const { toast } = useToast()
  const { user } = useUser()
  const [avatarPreview, setAvatarPreview] = useState<string>("")
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

    // Preview the image locally first
    const reader = new FileReader()
    reader.onloadend = () => {
      setAvatarPreview(reader.result as string)
    }
    reader.readAsDataURL(file)

    setUploading(true)
    const formData = new FormData()
    formData.append("file", file)

    try {
      // Upload to Cloudflare R2 via Worker API
      const response = await fetch("https://pharmx-api.kasimhussain333.workers.dev/api/v1/upload/avatar", {
        method: "POST",
        body: formData,
        headers: {
          // Add authorization header if token exists
          ...(localStorage.getItem('pharmx_token') && {
            'Authorization': `Bearer ${localStorage.getItem('pharmx_token')}`,
          }),
        },
      })
      
      if (!response.ok) {
        throw new Error('Upload failed')
      }
      
      const result = await response.json()
      setValue("avatarUrl", result.url) // Store the server URL
      
      toast({
        title: "Photo uploaded",
        description: "Your profile photo has been updated",
      })
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
      // Combine date parts into ISO date string
      const dob = `${data.dobYear}-${data.dobMonth.padStart(2, '0')}-${data.dobDay.padStart(2, '0')}`
      const profileData = {
        ...data,
        dob,
        dobDay: undefined,
        dobMonth: undefined,
        dobYear: undefined,
      }
      
      const response = await fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profileData),
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
              <div>
                <Input
                  id="avatar"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarUpload}
                  disabled={uploading}
                />
                <Label 
                  htmlFor="avatar" 
                  className="cursor-pointer inline-block"
                >
                  <div className="bg-white hover:bg-gray-100 text-black border border-gray-300 px-4 py-2 rounded-md text-sm font-medium transition-colors">
                    {uploading ? "Uploading..." : "Upload Photo"}
                  </div>
                </Label>
              </div>
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
                  <RadioGroupItem value="male" id="male" className="text-black border-gray-400" />
                  <Label htmlFor="male" className="text-gray-700 cursor-pointer">Male</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="female" id="female" className="text-black border-gray-400" />
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
              <Label className="text-gray-700 font-medium flex items-center gap-2">
                <Calendar className="w-4 h-4" /> Date of Birth
              </Label>
              <div className="flex gap-2">
                <div className="flex-1">
                  <Label className="text-xs text-gray-500 mb-1 block">Day</Label>
                  <Input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    placeholder="DD"
                    maxLength={2}
                    className="w-full text-center border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                    {...register("dobDay")}
                    onChange={(e) => {
                      const value = e.target.value.replace(/\D/g, '')
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
                  <Label className="text-xs text-gray-500 mb-1 block">Month</Label>
                  <Input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    placeholder="MM"
                    maxLength={2}
                    className="w-full text-center border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                    {...register("dobMonth")}
                    onChange={(e) => {
                      const value = e.target.value.replace(/\D/g, '')
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
                  <Label className="text-xs text-gray-500 mb-1 block">Year</Label>
                  <Input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    placeholder="YYYY"
                    maxLength={4}
                    className="w-full text-center border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                    {...register("dobYear")}
                    onChange={(e) => {
                      const value = e.target.value.replace(/\D/g, '')
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
              className="w-full bg-black hover:bg-gray-900 text-white font-semibold py-3 rounded-lg transition-colors"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Creating Profile..." : "Complete Profile"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}
