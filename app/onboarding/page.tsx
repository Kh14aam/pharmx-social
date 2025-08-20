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
import { Progress } from "@/components/ui/progress"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { CalendarIcon, Upload } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

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
  const [avatarPreview, setAvatarPreview] = useState<string>("")
  const [uploading, setUploading] = useState(false)
  const [step, setStep] = useState(1)

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
  const progress = step * 33.33

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
    } catch (error) {
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
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create profile. Please try again.",
        variant: "destructive",
      })
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8 bg-gradient-to-b from-background to-muted/20">
      <div className="max-w-md w-full">
        <div className="bg-card rounded-2xl p-8 shadow-lg border">
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-bold">Complete Your Profile</h1>
              <p className="text-muted-foreground mt-1">
                Help others get to know you
              </p>
            </div>

            <Progress value={progress} className="h-2" />

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {step === 1 && (
                <div className="space-y-4">
                  <div className="flex flex-col items-center space-y-4">
                    <Avatar className="w-24 h-24">
                      {avatarPreview ? (
                        <AvatarImage src={avatarPreview} />
                      ) : (
                        <AvatarFallback>
                          <Upload className="w-8 h-8 text-muted-foreground" />
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
                      <Button type="button" variant="outline" disabled={uploading}>
                        {uploading ? "Uploading..." : "Upload Avatar"}
                      </Button>
                    </Label>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="name">Name</Label>
                    <Input
                      id="name"
                      placeholder="Enter your name"
                      {...register("name")}
                    />
                    {errors.name && (
                      <p className="text-sm text-destructive">{errors.name.message}</p>
                    )}
                  </div>

                  <Button 
                    type="button" 
                    className="w-full"
                    onClick={() => setStep(2)}
                    disabled={!watchedFields.name || !!errors.name}
                  >
                    Continue
                  </Button>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-4">
                  <div className="space-y-3">
                    <Label>Gender</Label>
                    <RadioGroup
                      onValueChange={(value) => setValue("gender", value as "male" | "female")}
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
                    <p className="text-xs text-muted-foreground">
                      ⚠️ Gender cannot be changed after profile creation
                    </p>
                    {errors.gender && (
                      <p className="text-sm text-destructive">{errors.gender.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="dob">Date of Birth</Label>
                    <Input
                      id="dob"
                      type="date"
                      {...register("dob")}
                      max={format(new Date(), "yyyy-MM-dd")}
                    />
                    {errors.dob && (
                      <p className="text-sm text-destructive">{errors.dob.message}</p>
                    )}
                  </div>

                  <div className="flex space-x-2">
                    <Button 
                      type="button" 
                      variant="outline"
                      className="flex-1"
                      onClick={() => setStep(1)}
                    >
                      Back
                    </Button>
                    <Button 
                      type="button" 
                      className="flex-1"
                      onClick={() => setStep(3)}
                      disabled={!watchedFields.gender || !watchedFields.dob}
                    >
                      Continue
                    </Button>
                  </div>
                </div>
              )}

              {step === 3 && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="bio">Bio</Label>
                    <Textarea
                      id="bio"
                      placeholder="Tell us about yourself..."
                      className="resize-none h-32"
                      maxLength={160}
                      {...register("bio")}
                    />
                    <p className="text-xs text-muted-foreground text-right">
                      {watchedFields.bio?.length || 0}/160
                    </p>
                    {errors.bio && (
                      <p className="text-sm text-destructive">{errors.bio.message}</p>
                    )}
                  </div>

                  <div className="flex space-x-2">
                    <Button 
                      type="button" 
                      variant="outline"
                      className="flex-1"
                      onClick={() => setStep(2)}
                    >
                      Back
                    </Button>
                    <Button 
                      type="submit"
                      className="flex-1"
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? "Creating..." : "Done"}
                    </Button>
                  </div>
                </div>
              )}
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
