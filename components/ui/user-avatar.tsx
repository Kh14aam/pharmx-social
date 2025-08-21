import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { User } from "lucide-react"

interface UserAvatarProps {
  src?: string | null
  fallback?: string
  className?: string
  userId?: string
}

export function UserAvatar({ src, fallback, className, userId }: UserAvatarProps) {
  // If we have a relative URL like /api/v1/avatars/{userId}, convert to full Worker URL
  const avatarUrl = src?.startsWith('/api/v1/avatars/') 
    ? `https://pharmx-api.kasimhussain333.workers.dev${src}`
    : src

  return (
    <Avatar className={className}>
      {avatarUrl ? (
        <AvatarImage src={avatarUrl} alt={fallback || "User avatar"} />
      ) : userId ? (
        <AvatarImage 
          src={`https://pharmx-api.kasimhussain333.workers.dev/api/v1/avatars/${userId}`} 
          alt={fallback || "User avatar"} 
        />
      ) : null}
      <AvatarFallback>
        {fallback ? (
          <span className="text-xs font-medium">{fallback}</span>
        ) : (
          <User className="w-4 h-4" />
        )}
      </AvatarFallback>
    </Avatar>
  )
}
