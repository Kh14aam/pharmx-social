import { Hono } from 'hono'
import type { Env } from '../index'

const upload = new Hono<{ Bindings: Env }>()

// Avatar upload endpoint
upload.post('/avatar', async (c) => {
  try {
    // Get user ID from JWT (you'll need to implement auth middleware)
    const userId = c.get('userId') || 'test-user' // Replace with actual auth
    
    // Parse the multipart form data
    const formData = await c.req.formData()
    const file = formData.get('file') as File
    
    if (!file) {
      return c.json({ error: 'No file provided' }, 400)
    }
    
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
    const extension = file.name.split('.').pop() || 'jpg'
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
    const imageUrl = `/api/v1/avatars/${userId}`
    await c.env.DB.prepare(
      `UPDATE users 
       SET avatar_url = ?, image_key = ?, updated_at = CURRENT_TIMESTAMP 
       WHERE id = ?`
    ).bind(imageUrl, key, userId).run()
    
    return c.json({
      success: true,
      url: imageUrl,
      key: key,
    })
  } catch (error) {
    console.error('Avatar upload error:', error)
    return c.json({ error: 'Failed to upload avatar' }, 500)
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
    
    for (const ext of extensions) {
      key = `avatars/${userId}/avatar.${ext}`
      object = await c.env.AVATARS.get(key)
      if (object) break
    }
    
    if (!object) {
      // Return default avatar or 404
      return c.text('Avatar not found', 404)
    }
    
    // Get the object body and headers
    const headers = new Headers()
    object.writeHttpMetadata(headers)
    headers.set('Cache-Control', 'public, max-age=3600')
    
    // Add cache busting with etag
    const etag = object.httpEtag
    if (etag) {
      headers.set('ETag', etag)
      
      // Check if client has cached version
      const ifNoneMatch = c.req.header('If-None-Match')
      if (ifNoneMatch === etag) {
        return c.text('', 304)
      }
    }
    
    return c.body(object.body, 200, headers)
  } catch (error) {
    console.error('Avatar fetch error:', error)
    return c.text('Internal server error', 500)
  }
})

export default upload
