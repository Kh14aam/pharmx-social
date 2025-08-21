import { Hono } from 'hono'
import type { Env } from '../index'
import { verifyAuth } from '../middleware/auth'

export const profileRoutes = new Hono<{ Bindings: Env }>()

function normalizeDob(input?: string | null): string | null {
  if (!input) return null
  // Accept YYYY-MM-DD. Reject others to avoid timezone shifts.
  const m = /^\d{4}-\d{2}-\d{2}$/.exec(input.trim())
  return m ? input.trim() : null
}

function normalizeGender(input?: string | null): 'male' | 'female' | null {
  if (!input) return null
  const g = String(input).toLowerCase()
  return g === 'male' || g === 'female' ? (g as 'male' | 'female') : null
}

// Get user profile
profileRoutes.get('/', verifyAuth, async (c) => {
  const userId = c.get('userId')
  
  console.log(`[Profile] Fetching profile for user ${userId}`)
  
  try {
    // Query user from D1 database
    const result = await c.env.DB.prepare(
      'SELECT * FROM users WHERE id = ?'
    ).bind(userId).first()
    
    if (!result) {
      console.log(`[Profile] User ${userId} not found in database`)
      return c.json({ error: 'User not found' }, 404)
    }
    
    console.log(`[Profile] Successfully fetched profile for user ${userId}`)
    return c.json(result)
  } catch (error) {
    console.error('[Profile] Error fetching profile:', error)
    return c.json({ 
      error: 'Failed to fetch profile',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, 500)
  }
})

// Create or update user profile (for onboarding)
profileRoutes.post('/', verifyAuth, async (c) => {
  const userId = c.get('userId')
  const userEmail = c.get('userEmail')
  
  console.log(`[Profile] Creating/updating profile for user ${userId}`)
  
  let body: any = {}
  try {
    body = await c.req.json()
    console.log(`[Profile] Request body:`, body)
  } catch (error) {
    console.error('[Profile] Failed to parse request body:', error)
    return c.json({ error: 'Invalid request body' }, 400)
  }
  
  const name = (body?.name ?? '').toString().trim()
  const gender = normalizeGender(body?.gender)
  const dob = normalizeDob(body?.dob || body?.dateOfBirth)
  const bio = body?.bio ? String(body.bio).trim() : null
  const location = body?.location ? String(body.location).trim() : null
  const avatarUrl = body?.avatarUrl || body?.avatar_url || null
  const imageKey = body?.imageKey || body?.image_key || null

  console.log(`[Profile] Parsed data - name: ${name}, gender: ${gender}, dob: ${dob}, avatarUrl: ${avatarUrl}`)

  if (!name) {
    console.error('[Profile] Name is required but not provided')
    return c.json({ error: 'Name is required' }, 400)
  }

  try {
    // Check if user already exists
    const existing = await c.env.DB.prepare(
      'SELECT id, email FROM users WHERE id = ?'
    ).bind(userId).first()
    
    if (existing) {
      // Update existing user - allow updating all fields
      const result = await c.env.DB.prepare(
        `UPDATE users 
         SET name = ?, 
             email = COALESCE(?, email),
             gender = ?, 
             date_of_birth = ?, 
             bio = ?, 
             location = ?,
             avatar_url = CASE WHEN ? IS NOT NULL THEN ? ELSE avatar_url END, 
             image_key = CASE WHEN ? IS NOT NULL THEN ? ELSE image_key END, 
             updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`
      ).bind(
        name, 
        userEmail,
        gender, 
        dob, 
        bio, 
        location,
        avatarUrl, avatarUrl,
        imageKey, imageKey,
        userId
      ).run()
      
      if (!result.success) {
        throw new Error('Failed to update user profile')
      }
    } else {
      // Create new user
      const result = await c.env.DB.prepare(
        `INSERT INTO users (id, email, name, gender, date_of_birth, bio, location, avatar_url, image_key, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`
      ).bind(userId, userEmail, name, gender, dob, bio, location, avatarUrl, imageKey).run()
      
      if (!result.success) {
        throw new Error('Failed to create user profile')
      }
    }
    
    // Return the updated profile
    const updatedProfile = await c.env.DB.prepare(
      'SELECT id, email, name, gender, date_of_birth, bio, location, avatar_url, image_key FROM users WHERE id = ?'
    ).bind(userId).first()
    
    return c.json({ 
      success: true,
      profile: updatedProfile
    })
  } catch (error) {
    console.error('Error creating/updating profile:', error)
    return c.json({ 
      error: 'Failed to save profile',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, 500)
  }
})

// Update user profile (partial updates)
profileRoutes.put('/', verifyAuth, async (c) => {
  const userId = c.get('userId')
  const userEmail = c.get('userEmail')
  
  let body: any = {}
  try {
    body = await c.req.json()
  } catch (error) {
    console.error('Failed to parse request body:', error)
    return c.json({ error: 'Invalid request body' }, 400)
  }
  
  // Parse fields allowing explicit null to clear values
  const name = body?.name !== undefined ? (body.name ? String(body.name).trim() : null) : undefined
  const bio = body?.bio !== undefined ? (body.bio ? String(body.bio).trim() : null) : undefined
  const gender = body?.gender !== undefined ? normalizeGender(body.gender) : undefined
  const dob = body?.dob !== undefined ? normalizeDob(body.dob || body.dateOfBirth) : undefined
  const location = body?.location !== undefined ? (body.location ? String(body.location).trim() : null) : undefined
  const avatarUrl = body?.avatarUrl !== undefined ? body.avatarUrl : (body?.avatar_url !== undefined ? body.avatar_url : undefined)
  const imageKey = body?.imageKey !== undefined ? body.imageKey : (body?.image_key !== undefined ? body.image_key : undefined)

  try {
    // Check if user exists, if not create it
    const existing = await c.env.DB.prepare(
      'SELECT id FROM users WHERE id = ?'
    ).bind(userId).first()
    
    if (!existing) {
      // Create user first if doesn't exist
      await c.env.DB.prepare(
        `INSERT INTO users (id, email, created_at, updated_at)
         VALUES (?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`
      ).bind(userId, userEmail).run()
    }
    
    // Build dynamic update query based on provided fields
    const updates: string[] = []
    const values: any[] = []
    
    if (name !== undefined) {
      updates.push('name = ?')
      values.push(name)
    }
    if (bio !== undefined) {
      updates.push('bio = ?')
      values.push(bio)
    }
    if (gender !== undefined) {
      updates.push('gender = ?')
      values.push(gender)
    }
    if (dob !== undefined) {
      updates.push('date_of_birth = ?')
      values.push(dob)
    }
    if (location !== undefined) {
      updates.push('location = ?')
      values.push(location)
    }
    if (avatarUrl !== undefined) {
      updates.push('avatar_url = ?')
      values.push(avatarUrl)
    }
    if (imageKey !== undefined) {
      updates.push('image_key = ?')
      values.push(imageKey)
    }
    
    if (updates.length === 0) {
      return c.json({ error: 'No fields to update' }, 400)
    }
    
    updates.push('updated_at = CURRENT_TIMESTAMP')
    values.push(userId) // for WHERE clause
    
    const result = await c.env.DB.prepare(
      `UPDATE users SET ${updates.join(', ')} WHERE id = ?`
    ).bind(...values).run()
    
    if (!result.success) {
      throw new Error('Failed to update profile')
    }
    
    // Return the updated profile
    const updatedProfile = await c.env.DB.prepare(
      'SELECT id, email, name, gender, date_of_birth, bio, location, avatar_url, image_key FROM users WHERE id = ?'
    ).bind(userId).first()
    
    return c.json({ 
      success: true,
      profile: updatedProfile
    })
  } catch (error) {
    console.error('Error updating profile:', error)
    return c.json({ 
      error: 'Failed to update profile',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, 500)
  }
})

