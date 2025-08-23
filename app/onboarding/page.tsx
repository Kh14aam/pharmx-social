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
import { Info, User } from "lucide-react"
import { apiClient } from '@/lib/api-client'

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
  const [avatarPreview, setAvatarPreview] = useState<string>("")
  const [uploading, setUploading] = useState(false)
  const [dobDay, setDobDay] = useState("")
  const [dobMonth, setDobMonth] = useState("")
  const [dobYear, setDobYear] = useState("")
  const [checkingProfile, setCheckingProfile] = useState(true)

  // All React hooks must be called at the top level
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

  // Check authentication and profile status
  useEffect(() => {
    const checkAuthAndProfile = async () => {
      console.log('[Onboarding] === ONBOARDING FLOW START ===')
      console.log('[Onboarding] Verifying authentication...')
      
      // Get the stored token and user data
      const token = localStorage.getItem('pharmx_token')
      const userData = localStorage.getItem('pharmx_user')
      console.log('[Onboarding] Stored data - Token:', !!token, 'User:', !!userData)
      
      if (!token || !userData) {
        console.log('[Onboarding] ❌ No authentication found, redirecting to login')
        router.push('/login')
        return
      }
      
      console.log('[Onboarding] ✅ Authentication verified')
      
      // Set the token in the API client
      apiClient.setToken(token)
      
      // Double-check if user already has a profile (safeguard for direct access)
      try {
        const profile = await apiClient.profile.get()
        if (profile && profile.name) {
          console.log('[Onboarding] ⚠️ User already has profile, redirecting to app')
          router.push('/app/voice')
          return
        }
      } catch {
        console.log('[Onboarding] Profile check confirmed - no existing profile (expected for new users)')
        // This is expected for new users, continue with onboarding
      }
      
      console.log('[Onboarding] ✅ Ready for profile creation')
      setCheckingProfile(false)
      console.log('[Onboarding] === ONBOARDING FLOW END ===')
    }

    checkAuthAndProfile()
  }, [router])

  // Show loading while checking profile
  if (checkingProfile) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-gray-300 border-t-gray-600 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Checking your profile...</p>
        </div>
      </div>
    )
  }

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    console.log('[Onboarding] Selected file:', file.name, 'size:', file.size, 'type:', file.type)

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
      console.log('[Onboarding] Uploading avatar...')
      // Upload to Cloudflare R2 via Worker API
      const result = await apiClient.profile.uploadAvatar(file)
      console.log('[Onboarding] Upload result:', result)
      setValue("avatarUrl", result.url) // Store the server URL
      
      toast({
        title: "Photo uploaded",
        description: "Your profile photo has been updated",
      })
    } catch (error) {
      console.error('[Onboarding] Upload error:', error)
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "Failed to upload image. Please try again.",
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
      
      console.log('[Onboarding] Submitting profile:', profileData)
      
      // Call Worker API with authentication
      const result = await apiClient.profile.create(profileData)
      console.log('[Onboarding] Profile created:', result)

      toast({
        title: "Welcome to PharmX Social!",
        description: "Your profile has been created successfully. Let's find you a voice chat!",
      })

      // Redirect to main app - users page as specified in the flow
      console.log('[Onboarding] Profile creation successful - redirecting to users page')
      router.push("/app/users")
    } catch (error) {
      console.error('[Onboarding] Profile creation error:', error)
      
      // Define error with details interface
      interface ErrorWithDetails extends Error {
        details?: string
      }
      
      // Extract detailed error message
      let errorMessage = "Failed to create profile. Please try again."
      if (error instanceof Error) {
        errorMessage = error.message
        // Check if there are additional details
        const errorWithDetails = error as ErrorWithDetails
        if (errorWithDetails.details) {
          errorMessage = `${error.message} - ${errorWithDetails.details}`
        }
      }
      
      toast({
        title: "Failed to create profile",
        description: errorMessage,
        variant: "destructive",
      })
      
      // Also log the full error details to console
      console.error('[Onboarding] Full error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        details: error instanceof Error && 'details' in error ? (error as ErrorWithDetails).details : undefined,
        error
      })
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-start justify-center p-4 pt-8 sm:pt-16">
      <div className="w-full max-w-2xl lg:max-w-4xl">
        <div className="bg-white rounded-2xl shadow-xl p-6 sm:p-8 lg:p-12">
          {/* Header */}
          <div className="text-center mb-8 lg:mb-12">
            <h1 className="text-3xl lg:text-4xl font-bold text-gray-900">Complete Your Profile</h1>
            <p className="text-gray-500 mt-2 text-lg">All fields are required</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 lg:space-y-8">
            {/* Avatar Upload - Responsive sizing */}
            <div className="flex flex-col items-center space-y-4">
              <div className="relative w-32 h-32 sm:w-40 sm:h-40 lg:w-48 lg:h-48 rounded-lg overflow-hidden border-4 border-gray-200">
                {avatarPreview ? (
                  <div 
                    className="absolute inset-0 bg-cover bg-center"
                    style={{ 
                      backgroundImage: `url(${avatarPreview})`,
                    }}
                  />
                ) : (
                  <div className="absolute inset-0 bg-gray-100 flex items-center justify-center">
                    <User className="w-8 h-8 sm:w-12 sm:h-12 lg:w-16 lg:h-16 text-gray-400" />
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

            {/* Form Grid for Desktop */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
              {/* Left Column */}
              <div className="space-y-6">
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
                  <Label className="text-gray-700 font-medium">
                    Date of Birth
                  </Label>
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
              </div>

              {/* Right Column */}
              <div className="space-y-6">
                {/* Bio */}
                <div className="space-y-2">
                  <Label htmlFor="bio" className="text-gray-700 font-medium">Bio</Label>
                  <Textarea
                    id="bio"
                    placeholder="Tell us about yourself..."
                    className="resize-none h-32 lg:h-40 w-full border-gray-300 focus:border-blue-500 focus:ring-blue-500"
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
              </div>
            </div>

            {/* Submit Button - Full width on mobile, centered on desktop */}
            <div className="pt-4">
              <Button 
                type="submit"
                className="w-full lg:w-auto lg:px-12 bg-black hover:bg-gray-900 text-white font-semibold py-3 rounded-lg transition-colors"
                disabled={isSubmitting}
              >
                {isSubmitting ? "Creating Profile..." : "Complete Profile"}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
