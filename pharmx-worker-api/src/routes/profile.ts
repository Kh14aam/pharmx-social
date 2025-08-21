import { Hono } from 'hono'
import type { Env } from '../index'
import { verifyAuth } from '../middleware/auth'

export const profileRoutes = new Hono<{ Bindings: Env }>()

// Get user profile
profileRoutes.get('/', verifyAuth, async (c) => {
  const userId = c.get('userId')
  
  try {
    // Query user from D1 database
    const result = await c.env.DB.prepare(
      'SELECT * FROM users WHERE id = ?'
    ).bind(userId).first()
    
    if (!result) {
      return c.json({ error: 'User not found' }, 404)
    }
    
    return c.json(result)
  } catch (error) {
    console.error('Error fetching profile:', error)
    return c.json({ error: 'Failed to fetch profile' }, 500)
  }
})

// Create user profile (for onboarding)
profileRoutes.post('/', verifyAuth, async (c) => {
  const userId = c.get('userId')
  const userEmail = c.get('userEmail')
  const body = await c.req.json()
  
  const { name, gender, dob, bio, avatarUrl } = body
  
  try {
    // Check if user already exists
    const existing = await c.env.DB.prepare(
      'SELECT id FROM users WHERE id = ?'
    ).bind(userId).first()
    
    if (existing) {
      // Update existing user
      await c.env.DB.prepare(
        `UPDATE users 
         SET name = ?, gender = ?, date_of_birth = ?, bio = ?, avatar_url = ?, updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`
      ).bind(name, gender, dob, bio, avatarUrl || null, userId).run()
    } else {
      // Create new user
      await c.env.DB.prepare(
        `INSERT INTO users (id, email, name, gender, date_of_birth, bio, avatar_url, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`
      ).bind(userId, userEmail, name, gender, dob, bio, avatarUrl || null).run()
    }
    
    return c.json({ success: true })
  } catch (error) {
    console.error('Error creating/updating profile:', error)
    return c.json({ error: 'Failed to create profile' }, 500)
  }
})

// Update user profile
profileRoutes.put('/', verifyAuth, async (c) => {
  const userId = c.get('userId')
  const body = await c.req.json()
  
  const { name, bio, avatar, location } = body
  
  try {
    const result = await c.env.DB.prepare(
      `UPDATE users 
       SET name = ?, bio = ?, avatar = ?, location = ?, updated_at = datetime('now')
       WHERE id = ?`
    ).bind(name, bio, avatar, location, userId).run()
    
    if (result.changes === 0) {
      return c.json({ error: 'User not found' }, 404)
    }
    
    return c.json({ success: true })
  } catch (error) {
    console.error('Error updating profile:', error)
    return c.json({ error: 'Failed to update profile' }, 500)
  }
})

// Upload avatar
profileRoutes.post('/avatar', verifyAuth, async (c) => {
  const userId = c.get('userId')
  const formData = await c.req.formData()
  const file = formData.get('avatar') as File
  
  if (!file) {
    return c.json({ error: 'No file provided' }, 400)
  }
  
  // For now, we'll store the avatar as a data URL
  // In production, you'd want to use R2 storage
  const buffer = await file.arrayBuffer()
  const base64 = btoa(String.fromCharCode(...new Uint8Array(buffer)))
  const dataUrl = `data:${file.type};base64,${base64}`
  
  try {
    await c.env.DB.prepare(
      'UPDATE users SET avatar = ?, updated_at = datetime("now") WHERE id = ?'
    ).bind(dataUrl, userId).run()
    
    return c.json({ success: true, avatar: dataUrl })
  } catch (error) {
    console.error('Error uploading avatar:', error)
    return c.json({ error: 'Failed to upload avatar' }, 500)
  }
})
