"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ChevronRight, Share2, Users, Gift, Copy, Check, Mail, MessageSquare, Link as LinkIcon } from "lucide-react"
import Link from "next/link"
import { useToast } from "@/hooks/use-toast"

export default function InviteFriendsPage() {
  const { toast } = useToast()
  const [email, setEmail] = useState("")
  const [copied, setCopied] = useState(false)
  const [inviteLink] = useState("https://chat.pharmx.co.uk/invite?ref=YOUR_REF_CODE")

  const handleEmailInvite = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim()) return

    // Simulate sending invite
    toast({
      title: "Invite sent!",
      description: `We've sent an invite to ${email}`,
    })
    setEmail("")
  }

  const copyInviteLink = async () => {
    try {
      await navigator.clipboard.writeText(inviteLink)
      setCopied(true)
      toast({
        title: "Link copied!",
        description: "Invite link copied to clipboard",
      })
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast({
        title: "Copy failed",
        description: "Please copy the link manually",
        variant: "destructive",
      })
    }
  }

  const shareInvite = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Join me on PharmX Social",
          text: "Connect with new people through voice calls and chats!",
          url: inviteLink,
        })
      } catch {
        // User cancelled sharing
      }
    } else {
      // Fallback to copying
      copyInviteLink()
    }
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 bg-background/95 backdrop-blur-sm border-b z-10">
        <div className="flex items-center justify-between px-4 py-3">
          <Link href="/settings" className="p-2 -ml-2">
            <ChevronRight className="h-5 w-5 rotate-180" />
          </Link>
          <h1 className="text-lg font-semibold">Invite Friends</h1>
          <div className="w-9" />
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Hero Section */}
        <Card className="p-6 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/20 dark:to-purple-950/20 border-blue-200 dark:border-blue-800">
          <div className="text-center space-y-4">
            <div className="mx-auto w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
              <Users className="h-8 w-8 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-blue-900 dark:text-blue-100">
                Invite Friends to PharmX
              </h2>
              <p className="text-blue-700 dark:text-blue-300 mt-2">
                Help your friends discover new connections through voice calls and chats
              </p>
            </div>
          </div>
        </Card>

        {/* Benefits */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Why invite friends?</h3>
          <div className="space-y-4">
            <div className="flex items-start space-x-3">
              <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                <Gift className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="font-medium">Free Premium Features</p>
                <p className="text-sm text-muted-foreground">
                  Both you and your friend get 1 month of premium features
                </p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <Users className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="font-medium">Larger Network</p>
                <p className="text-sm text-muted-foreground">
                  More people to connect with and chat
                </p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                <MessageSquare className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="font-medium">Better Matches</p>
                <p className="text-sm text-muted-foreground">
                  Friends of friends often make great connections
                </p>
              </div>
            </div>
          </div>
        </Card>

        {/* Email Invite */}
        <Card className="p-6">
          <div className="flex items-center space-x-3 mb-4">
            <Mail className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-semibold">Send Email Invite</h3>
          </div>
          
          <form onSubmit={handleEmailInvite} className="space-y-4">
            <div>
              <Label htmlFor="email">Friend&apos;s Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="friend@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-2"
              />
            </div>
            <Button type="submit" className="w-full">
              Send Invite
            </Button>
          </form>
        </Card>

        {/* Share Link */}
        <Card className="p-6">
          <div className="flex items-center space-x-3 mb-4">
            <LinkIcon className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-semibold">Share Invite Link</h3>
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Input
                value={inviteLink}
                readOnly
                className="flex-1"
              />
              <Button
                size="icon"
                variant="outline"
                onClick={copyInviteLink}
                className="shrink-0"
              >
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
            
            <div className="flex gap-2">
              <Button onClick={shareInvite} className="flex-1">
                <Share2 className="h-4 w-4 mr-2" />
                Share
              </Button>
              <Button variant="outline" className="flex-1">
                <MessageSquare className="h-4 w-4 mr-2" />
                SMS
              </Button>
            </div>
          </div>
        </Card>

        {/* Social Media */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Share on Social Media</h3>
          <div className="grid grid-cols-2 gap-3">
            <Button variant="outline" className="h-12">
              <div className="w-6 h-6 bg-blue-500 rounded mr-2" />
              Facebook
            </Button>
            <Button variant="outline" className="h-12">
              <div className="w-6 h-6 bg-blue-400 rounded mr-2" />
              Twitter
            </Button>
            <Button variant="outline" className="h-12">
              <div className="w-6 h-6 bg-pink-500 rounded mr-2" />
              Instagram
            </Button>
            <Button variant="outline" className="h-12">
              <div className="w-6 h-6 bg-green-500 rounded mr-2" />
              WhatsApp
            </Button>
          </div>
        </Card>

        {/* Stats */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Your Invites</h3>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold text-primary">0</p>
              <p className="text-sm text-muted-foreground">Sent</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-green-600">0</p>
              <p className="text-sm text-muted-foreground">Accepted</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-blue-600">0</p>
              <p className="text-sm text-muted-foreground">Rewards</p>
            </div>
          </div>
        </Card>

        {/* Info */}
        <Card className="p-6 bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
          <div className="flex items-start space-x-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <Gift className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h4 className="font-medium text-blue-900 dark:text-blue-100">Rewards Program</h4>
              <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                For every 3 friends who join, you get 1 month of premium features. Your friends also get 1 month free when they sign up!
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
} 