import { Hono } from 'hono'
import type { Env } from '../index'
import { verifyAuth } from '../middleware/auth'

export const diagnosticRoutes = new Hono<{ Bindings: Env }>()

// Test database connection and user data
diagnosticRoutes.get('/check', verifyAuth, async (c) => {
  const userId = c.get('userId')
  const userEmail = c.get('userEmail')
  
  interface DiagnosticResult {
    timestamp: string
    auth: {
      userId: string | undefined
      userEmail: string | undefined
      hasUserId: boolean
      hasUserEmail: boolean
    }
    database: {
      connected: boolean
      userExists: boolean
      userData: unknown
      error: string | null
      tableSchema?: unknown
    }
    environment: {
      hasDB: boolean
      hasAvatars: boolean
      hasSessions: boolean
    }
  }
  
  const diagnostics: DiagnosticResult = {
    timestamp: new Date().toISOString(),
    auth: {
      userId,
      userEmail,
      hasUserId: !!userId,
      hasUserEmail: !!userEmail
    },
    database: {
      connected: false,
      userExists: false,
      userData: null,
      error: null
    },
    environment: {
      hasDB: !!c.env.DB,
      hasAvatars: !!c.env.AVATARS,
      hasSessions: !!c.env.SESSIONS
    }
  }
  
  try {
    // Test database connection
    const testQuery = await c.env.DB.prepare('SELECT 1 as test').first()
    diagnostics.database.connected = !!testQuery
    
    // Check if user exists
    if (userId) {
      const user = await c.env.DB.prepare(
        'SELECT * FROM users WHERE id = ?'
      ).bind(userId).first()
      
      diagnostics.database.userExists = !!user
      diagnostics.database.userData = user
    }
    
    // Get table schema info
    const tableInfo = await c.env.DB.prepare(
      "SELECT sql FROM sqlite_master WHERE type='table' AND name='users'"
    ).first()
    diagnostics.database.tableSchema = tableInfo
    
  } catch (error) {
    diagnostics.database.error = error instanceof Error ? error.message : 'Unknown error'
    console.error('[Diagnostic] Database error:', error)
  }
  
  return c.json(diagnostics)
})

// Test profile creation with sample data
diagnosticRoutes.post('/test-create', verifyAuth, async (c) => {
  const userId = c.get('userId')
  const userEmail = c.get('userEmail') || `${userId}@test.pharmx.co.uk`
  
  console.log(`[Diagnostic] Testing profile creation for ${userId}`)
  
  const testData = {
    name: 'Test User',
    gender: 'male' as const,
    dob: '1990-01-01',
    bio: 'This is a test profile',
    location: 'Test Location'
  }
  
  try {
    // First, check if user exists
    const existing = await c.env.DB.prepare(
      'SELECT * FROM users WHERE id = ?'
    ).bind(userId).first()
    
    if (existing) {
      console.log('[Diagnostic] User exists, will update')
      // Update existing
      const result = await c.env.DB.prepare(
        `UPDATE users 
         SET name = ?, 
             email = COALESCE(?, email),
             gender = ?, 
             date_of_birth = ?, 
             bio = ?, 
             location = ?,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`
      ).bind(
        testData.name,
        userEmail,
        testData.gender,
        testData.dob,
        testData.bio,
        testData.location,
        userId
      ).run()
      
      return c.json({
        success: true,
        operation: 'update',
        result,
        data: await c.env.DB.prepare('SELECT * FROM users WHERE id = ?').bind(userId).first()
      })
    } else {
      console.log('[Diagnostic] User does not exist, will create')
      // Create new
      const result = await c.env.DB.prepare(
        `INSERT INTO users (id, email, name, gender, date_of_birth, bio, location, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`
      ).bind(
        userId,
        userEmail,
        testData.name,
        testData.gender,
        testData.dob,
        testData.bio,
        testData.location
      ).run()
      
      return c.json({
        success: true,
        operation: 'insert',
        result,
        data: await c.env.DB.prepare('SELECT * FROM users WHERE id = ?').bind(userId).first()
      })
    }
  } catch (error) {
    console.error('[Diagnostic] Test create error:', error)
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      errorStack: error instanceof Error ? error.stack : null
    }, 500)
  }
})

export default diagnosticRoutes
