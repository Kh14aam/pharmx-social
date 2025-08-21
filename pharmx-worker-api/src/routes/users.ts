import { Hono } from 'hono'
import type { Env } from '../index'
import { verifyAuth } from '../middleware/auth'

export const usersRoutes = new Hono<{ Bindings: Env }>()

// Get all users (for discovery)
usersRoutes.get('/', verifyAuth, async (c) => {
  const limit = parseInt(c.req.query('limit') || '20')
  const offset = parseInt(c.req.query('offset') || '0')
  
  try {
    const result = await c.env.DB.prepare(
      `SELECT id, name, email, avatar, bio, location, created_at 
       FROM users 
       ORDER BY created_at DESC 
       LIMIT ? OFFSET ?`
    ).bind(limit, offset).all()
    
    return c.json({
      users: result.results,
      total: result.results.length,
      limit,
      offset
    })
  } catch (error) {
    console.error('Error fetching users:', error)
    return c.json({ error: 'Failed to fetch users' }, 500)
  }
})

// Get specific user
usersRoutes.get('/:id', verifyAuth, async (c) => {
  const userId = c.req.param('id')
  
  try {
    const user = await c.env.DB.prepare(
      'SELECT id, name, email, avatar, bio, location, created_at FROM users WHERE id = ?'
    ).bind(userId).first()
    
    if (!user) {
      return c.json({ error: 'User not found' }, 404)
    }
    
    return c.json(user)
  } catch (error) {
    console.error('Error fetching user:', error)
    return c.json({ error: 'Failed to fetch user' }, 500)
  }
})

// Search users
usersRoutes.get('/search', verifyAuth, async (c) => {
  const query = c.req.query('q')
  
  if (!query) {
    return c.json({ error: 'Search query required' }, 400)
  }
  
  try {
    const result = await c.env.DB.prepare(
      `SELECT id, name, email, avatar, bio, location 
       FROM users 
       WHERE name LIKE ? OR email LIKE ? 
       LIMIT 10`
    ).bind(`%${query}%`, `%${query}%`).all()
    
    return c.json({
      users: result.results
    })
  } catch (error) {
    console.error('Error searching users:', error)
    return c.json({ error: 'Failed to search users' }, 500)
  }
})
