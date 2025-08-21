import { Hono } from 'hono'
import type { Env } from '../index'
import { verifyAuth } from '../middleware/auth'

const upload = new Hono<{ Bindings: Env }>()

// Test endpoint to verify upload service is working
upload.get('/test', async (c) => {
  return c.json({
    status: 'ok',
    hasR2: !!c.env.AVATARS,
    hasDB: !!c.env.DB,
    timestamp: new Date().toISOString()
  })
})

// Avatar upload endpoint - requires authentication
upload.post('/avatar', verifyAuth, async (c) => {
  try {
    // Get authenticated user ID from middleware
    const userId = c.get('userId') as string
    const userEmail = c.get('userEmail') as string
    
    console.log(`[Upload] Starting avatar upload for user ${userId}, email: ${userEmail}`)
    
    // Check if we have required environment variables
    if (!c.env.AVATARS) {
      console.error('[Upload] R2 bucket AVATARS is not configured')
      return c.json({ error: 'Storage service not configured' }, 500)
    }
    
    if (!c.env.DB) {
      console.error('[Upload] Database DB is not configured')
      return c.json({ error: 'Database service not configured' }, 500)
    }
    
    // Check if user exists in database first
    const existingUser = await c.env.DB.prepare(
      'SELECT id, email FROM users WHERE id = ?'
    ).bind(userId).first()
    
    // If user doesn't exist, create a minimal profile first
    if (!existingUser) {
      console.log(`[Upload] Creating user profile for ${userId} during avatar upload`)
      try {
        await c.env.DB.prepare(
          `INSERT INTO users (id, email, created_at, updated_at)
           VALUES (?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`
        ).bind(userId, userEmail || `${userId}@placeholder.com`).run()
      } catch (dbError) {
        console.error('[Upload] Error creating user:', dbError)
        // Continue anyway - the user might already exist
      }
    } else {
      console.log(`[Upload] User ${userId} already exists`)
    }
    
    // Parse the multipart form data
    let formData: FormData
    try {
      formData = await c.req.formData()
    } catch (parseError) {
      console.error('[Upload] Error parsing form data:', parseError)
      return c.json({ error: 'Invalid form data' }, 400)
    }
    
    console.log(`[Upload] FormData keys:`, Array.from(formData.keys()))
    
    // Try both field names for compatibility
    const file = (formData.get('file') || formData.get('avatar')) as File
    
    if (!file || !(file instanceof File)) {
      console.error(`[Upload] No valid file found in form data. Keys: ${Array.from(formData.keys()).join(', ')}`)
      return c.json({ error: 'No file provided in request' }, 400)
    }
    
    console.log(`[Upload] File received: ${file.name}, size: ${file.size}, type: ${file.type}`)
    
    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']
    if (!allowedTypes.includes(file.type)) {
      return c.json({ error: 'Invalid file type. Only JPEG, PNG, WebP, and GIF are allowed.' }, 400)
    }
    
    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      return c.json({ error: 'File too large. Maximum size is 5MB.' }, 400)
    }
    
    // Generate key for R2 (overwrite-in-place strategy)
    const extension = file.name.split('.').pop()?.toLowerCase() || 'jpg'
    const key = `avatars/${userId}/avatar.${extension}`
    
    // Upload to R2
    const arrayBuffer = await file.arrayBuffer()
    await c.env.AVATARS.put(key, arrayBuffer, {
      httpMetadata: {
        contentType: file.type,
        cacheControl: 'public, max-age=3600',
      },
      customMetadata: {
        userId,
        uploadedAt: new Date().toISOString(),
      },
    })
    
    // Update user profile in D1
    const imageUrl = `/api/v1/upload/avatars/${userId}`
    const updateResult = await c.env.DB.prepare(
      `UPDATE users 
       SET avatar_url = ?, image_key = ?, updated_at = CURRENT_TIMESTAMP 
       WHERE id = ?`
    ).bind(imageUrl, key, userId).run()
    
    if (!updateResult.success) {
      throw new Error('Failed to update user record with avatar information')
    }
    
    return c.json({
      success: true,
      url: imageUrl,
      key: key,
    })
  } catch (error) {
    console.error('Avatar upload error:', error)
    return c.json({ 
      error: 'Failed to upload avatar',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, 500)
  }
})

// Serve avatar images from R2
upload.get('/avatars/:userId', async (c) => {
  try {
    const userId = c.req.param('userId')
    
    // Try different extensions in order of preference
    const extensions = ['webp', 'jpg', 'jpeg', 'png', 'gif']
    let object = null
    let key = ''
    let fileExtension = ''
    
    for (const ext of extensions) {
      key = `avatars/${userId}/avatar.${ext}`
      object = await c.env.AVATARS.get(key)
      if (object) {
        fileExtension = ext
        break
      }
    }
    
    if (!object) {
      // Return default avatar or 404
      return c.text('Avatar not found', 404)
    }
    
    // Get the object body and headers
    const headers = new Headers()
    
    // Write HTTP metadata from R2 object
    object.writeHttpMetadata(headers)
    
    // Ensure Content-Type is set correctly based on file extension
    // This overrides any potentially missing or incorrect content type from R2
    const contentTypeMap: Record<string, string> = {
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'png': 'image/png',
      'webp': 'image/webp',
      'gif': 'image/gif'
    }
    
    const contentType = contentTypeMap[fileExtension] || 'application/octet-stream'
    headers.set('Content-Type', contentType)
    headers.set('Cache-Control', 'public, max-age=3600')
    
    // Add CORS headers for cross-origin image loading
    headers.set('Access-Control-Allow-Origin', '*')
    headers.set('Access-Control-Allow-Methods', 'GET, OPTIONS')
    
    // Add cache busting with etag
    const etag = object.httpEtag
    if (etag) {
      headers.set('ETag', etag)
      
      // Check if client has cached version
      const ifNoneMatch = c.req.header('If-None-Match')
      if (ifNoneMatch === etag) {
        return new Response(null, { status: 304, headers })
      }
    }
    
    // Return the image with proper headers
    return new Response(object.body, {
      status: 200,
      headers
    })
  } catch (error) {
    console.error('Avatar fetch error:', error)
    return c.text('Internal server error', 500)
  }
})

export default upload
