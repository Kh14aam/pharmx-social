"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { ChevronRight, ChevronDown, HelpCircle, MessageSquare, Mail, Phone, Search } from "lucide-react"
import Link from "next/link"
import { useToast } from "@/hooks/use-toast"

const faqData = [
  {
    id: "getting-started",
    question: "How do I get started with voice chat?",
    answer: "Simply tap 'Find a Voice' on the main screen. We'll match you with someone new for a voice conversation. Make sure your microphone is enabled when prompted."
  },
  {
    id: "safety",
    question: "Is my personal information safe?",
    answer: "Yes, we take privacy seriously. We only share your first name and profile photo with matches. Your conversations are not recorded, and you control what information to share."
  },
  {
    id: "matching",
    question: "How does the matching system work?",
    answer: "Our system matches you randomly with other users who are also looking for a voice chat. After your conversation, both people decide if they want to stay connected."
  },
  {
    id: "reporting",
    question: "What should I do if someone is inappropriate?",
    answer: "You can end the call immediately and report the user. We have zero tolerance for inappropriate behavior and will take action against violating accounts."
  },
  {
    id: "technical",
    question: "Voice chat isn't working. What should I do?",
    answer: "First, check that your microphone permissions are enabled. Try refreshing the page or restarting the app. If problems persist, contact our support team."
  },
  {
    id: "account",
    question: "How do I delete my account?",
    answer: "You can delete your account from the Account settings page. This will permanently remove all your data and cannot be undone."
  }
]

export default function HelpPage() {
  const { toast } = useToast()
  const [searchQuery, setSearchQuery] = useState("")
  const [openItems, setOpenItems] = useState<string[]>([])
  const [contactForm, setContactForm] = useState({
    name: "",
    email: "",
    subject: "",
    message: ""
  })
  const [submitting, setSubmitting] = useState(false)

  const filteredFAQ = faqData.filter(item =>
    item.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.answer.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const toggleItem = (id: string) => {
    setOpenItems(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    )
  }

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)

    // Simulate form submission
    await new Promise(resolve => setTimeout(resolve, 1000))

    toast({
      title: "Message sent!",
      description: "We'll get back to you within 24 hours.",
    })

    setContactForm({ name: "", email: "", subject: "", message: "" })
    setSubmitting(false)
  }

  const handleFormChange = (field: string, value: string) => {
    setContactForm(prev => ({ ...prev, [field]: value }))
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 bg-background/95 backdrop-blur-sm border-b z-10">
        <div className="flex items-center justify-between px-4 py-3">
          <Link href="/settings" className="p-2 -ml-2">
            <ChevronRight className="h-5 w-5 rotate-180" />
          </Link>
          <h1 className="text-lg font-semibold">Help & Support</h1>
          <div className="w-9" />
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-8">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search help articles..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="p-4 hover:shadow-md transition-shadow cursor-pointer">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-green-500/10 rounded-lg">
                <MessageSquare className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <h3 className="font-semibold">Live Chat</h3>
                <p className="text-sm text-muted-foreground">Chat with support</p>
              </div>
            </div>
          </Card>

          <Card className="p-4 hover:shadow-md transition-shadow cursor-pointer">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-500/10 rounded-lg">
                <Mail className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <h3 className="font-semibold">Email Us</h3>
                <p className="text-sm text-muted-foreground">support@pharmx.com</p>
              </div>
            </div>
          </Card>

          <Card className="p-4 hover:shadow-md transition-shadow cursor-pointer">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-purple-500/10 rounded-lg">
                <Phone className="h-5 w-5 text-purple-500" />
              </div>
              <div>
                <h3 className="font-semibold">Call Us</h3>
                <p className="text-sm text-muted-foreground">+1 (555) 123-4567</p>
              </div>
            </div>
          </Card>
        </div>

        {/* FAQ Section */}
        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <HelpCircle className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-semibold">Frequently Asked Questions</h2>
          </div>

          <div className="space-y-2">
            {filteredFAQ.map((item) => (
              <Collapsible
                key={item.id}
                open={openItems.includes(item.id)}
                onOpenChange={() => toggleItem(item.id)}
              >
                <CollapsibleTrigger asChild>
                  <Card className="p-4 hover:shadow-sm transition-shadow cursor-pointer">
                    <div className="flex items-center justify-between">
                      <h3 className="font-medium text-left">{item.question}</h3>
                      <ChevronDown 
                        className={`h-4 w-4 transition-transform ${
                          openItems.includes(item.id) ? 'rotate-180' : ''
                        }`} 
                      />
                    </div>
                  </Card>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="px-4 pb-4">
                    <p className="text-muted-foreground">{item.answer}</p>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            ))}
          </div>

          {filteredFAQ.length === 0 && searchQuery && (
            <Card className="p-8 text-center">
              <HelpCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-semibold mb-2">No results found</h3>
              <p className="text-muted-foreground">
                Try different keywords or contact our support team directly.
              </p>
            </Card>
          )}
        </div>

        {/* Contact Form */}
        <Card className="p-6">
          <div className="flex items-center space-x-2 mb-4">
            <MessageSquare className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-semibold">Contact Support</h2>
          </div>
          
          <form onSubmit={handleContactSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={contactForm.name}
                  onChange={(e) => handleFormChange("name", e.target.value)}
                  required
                />
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={contactForm.email}
                  onChange={(e) => handleFormChange("email", e.target.value)}
                  required
                />
              </div>
            </div>

            <div>
              <Label htmlFor="subject">Subject</Label>
              <Input
                id="subject"
                value={contactForm.subject}
                onChange={(e) => handleFormChange("subject", e.target.value)}
                required
              />
            </div>

            <div>
              <Label htmlFor="message">Message</Label>
              <Textarea
                id="message"
                rows={5}
                value={contactForm.message}
                onChange={(e) => handleFormChange("message", e.target.value)}
                placeholder="Describe your issue or question..."
                required
              />
            </div>

            <Button 
              type="submit" 
              className="w-full"
              disabled={submitting}
            >
              {submitting ? "Sending..." : "Send Message"}
            </Button>
          </form>
        </Card>

        {/* Additional Resources */}
        <Card className="p-6">
          <h3 className="font-semibold mb-4">Additional Resources</h3>
          <div className="space-y-3">
            <Link 
              href="/legal/privacy"
              className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors"
            >
              <span>Privacy Policy</span>
              <ChevronRight className="h-4 w-4" />
            </Link>
            <Link 
              href="/legal/terms"
              className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors"
            >
              <span>Terms of Service</span>
              <ChevronRight className="h-4 w-4" />
            </Link>
            <Link 
              href="/legal/community-guidelines"
              className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors"
            >
              <span>Community Guidelines</span>
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
        </Card>
      </div>
    </div>
  )
}
