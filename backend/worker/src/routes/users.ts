import { Hono } from 'hono'
import { verifyAuth } from '../middleware/auth'
import { moderateRateLimit } from '../middleware/rate-limit'
import type { Env } from '../index'

const app = new Hono<{ Bindings: Env }>()

// Apply rate limiting to all user routes
app.use('*', moderateRateLimit)

// Get all users with pagination and filtering
app.get('/', verifyAuth, async (c) => {
  try {
    const { page = '1', limit = '20', search = '', gender, ageMin, ageMax } = c.req.query()
    const pageNum = parseInt(page) || 1
    const limitNum = Math.min(parseInt(limit) || 20, 100) // Max 100 users per page
    const offset = (pageNum - 1) * limitNum
    
    // Build WHERE clause for filtering
    let whereClause = 'WHERE 1=1'
    const params: any[] = []
    let paramIndex = 1
    
    if (search) {
      whereClause += ` AND (name LIKE ? OR bio LIKE ?)`
      params.push(`%${search}%`, `%${search}%`)
      paramIndex += 2
    }
    
    if (gender) {
      whereClause += ` AND gender = ?`
      params.push(gender)
      paramIndex += 1
    }
    
    if (ageMin || ageMax) {
      const currentYear = new Date().getFullYear()
      if (ageMin) {
        const maxBirthYear = currentYear - parseInt(ageMin)
        whereClause += ` AND YEAR(dob) <= ?`
        params.push(maxBirthYear)
        paramIndex += 1
      }
      if (ageMax) {
        const minBirthYear = currentYear - parseInt(ageMax)
        whereClause += ` AND YEAR(dob) >= ?`
        params.push(minBirthYear)
        paramIndex += 1
      }
    }
    
    // Get total count for pagination
    const countQuery = `SELECT COUNT(*) as total FROM users ${whereClause}`
    const countResult = await c.env.DB.prepare(countQuery).bind(...params).first()
    const totalUsers = countResult?.total || 0
    
    // Get users with pagination
    const usersQuery = `
      SELECT 
        id, name, bio, gender, dob, avatar_url, created_at,
        CASE 
          WHEN YEAR(CURDATE()) - YEAR(dob) - (DATE_FORMAT(CURDATE(), '%m%d') < DATE_FORMAT(dob, '%m%d')) < 18 
          THEN 'underage'
          ELSE 'adult'
        END as age_status
      FROM users 
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `
    
    const usersResult = await c.env.DB.prepare(usersQuery)
      .bind(...params, limitNum, offset)
      .all()
    
    const users = usersResult.results.map((user: any) => ({
      id: user.id,
      name: user.name,
      bio: user.bio,
      gender: user.gender,
      age: user.age_status === 'adult' ? 
        new Date().getFullYear() - new Date(user.dob).getFullYear() : 
        null,
      avatarUrl: user.avatar_url,
      createdAt: user.created_at,
      isAdult: user.age_status === 'adult'
    }))
    
    return c.json({
      users,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: totalUsers,
        totalPages: Math.ceil(totalUsers / limitNum),
        hasNext: pageNum * limitNum < totalUsers,
        hasPrev: pageNum > 1
      }
    })
    
  } catch (error) {
    console.error('Failed to fetch users:', error)
    return c.json({ error: 'Failed to fetch users' }, 500)
  }
})

// Get user by ID with membership status
app.get('/:id', verifyAuth, async (c) => {
  try {
    const userId = c.req.param('id')
    const requestingUserId = c.get('userId')
    
    // Get user profile
    const userResult = await c.env.DB.prepare(`
      SELECT 
        id, name, bio, gender, dob, avatar_url, created_at,
        CASE 
          WHEN YEAR(CURDATE()) - YEAR(dob) - (DATE_FORMAT(CURDATE(), '%m%d') < DATE_FORMAT(dob, '%m%d')) < 18 
          THEN 'underage'
          ELSE 'adult'
        END as age_status
      FROM users 
      WHERE id = ?
    `).bind(userId).first()
    
    if (!userResult) {
      return c.json({ error: 'User not found' }, 404)
    }
    
    // Check if requesting user has membership
    const membershipResult = await c.env.DB.prepare(`
      SELECT membership_type, expires_at 
      FROM user_memberships 
      WHERE user_id = ? AND expires_at > datetime('now')
    `).bind(requestingUserId).first()
    
    const hasMembership = !!membershipResult
    
    // Check if users have an existing chat
    const existingChat = await c.env.DB.prepare(`
      SELECT id FROM chats 
      WHERE (user1_id = ? AND user2_id = ?) OR (user1_id = ? AND user2_id = ?)
    `).bind(requestingUserId, userId, userId, requestingUserId).first()
    
    const user = {
      id: userResult.id,
      name: userResult.name,
      bio: userResult.bio,
      gender: userResult.gender,
      age: userResult.age_status === 'adult' ? 
        new Date().getFullYear() - new Date(userResult.dob).getFullYear() : 
        null,
      avatarUrl: userResult.avatar_url,
      createdAt: userResult.created_at,
      isAdult: userResult.age_status === 'adult',
      canMessage: hasMembership || !!existingChat,
      membershipRequired: !hasMembership && !existingChat
    }
    
    return c.json({ user })
    
  } catch (error) {
    console.error('Failed to fetch user:', error)
    return c.json({ error: 'Failed to fetch user' }, 500)
  }
})

// Check if user can message another user
app.post('/:id/can-message', verifyAuth, async (c) => {
  try {
    const targetUserId = c.req.param('id')
    const requestingUserId = c.get('userId')
    
    if (targetUserId === requestingUserId) {
      return c.json({ error: 'Cannot message yourself' }, 400)
    }
    
    // Check membership status
    const membershipResult = await c.env.DB.prepare(`
      SELECT membership_type, expires_at 
      FROM user_memberships 
      WHERE user_id = ? AND expires_at > datetime('now')
    `).bind(requestingUserId).first()
    
    const hasMembership = !!membershipResult
    
    // Check for existing chat
    const existingChat = await c.env.DB.prepare(`
      SELECT id FROM chats 
      WHERE (user1_id = ? AND user2_id = ?) OR (user1_id = ? AND user2_id = ?)
    `).bind(requestingUserId, targetUserId, targetUserId, requestingUserId).first()
    
    const canMessage = hasMembership || !!existingChat
    
    return c.json({
      canMessage,
      membershipRequired: !hasMembership && !existingChat,
      membershipType: membershipResult?.membership_type || null,
      membershipExpires: membershipResult?.expires_at || null,
      existingChatId: existingChat?.id || null
    })
    
  } catch (error) {
    console.error('Failed to check messaging permission:', error)
    return c.json({ error: 'Failed to check messaging permission' }, 500)
  }
})

// Get user statistics
app.get('/:id/stats', verifyAuth, async (c) => {
  try {
    const userId = c.req.param('id')
    
    // Get call statistics
    const callStats = await c.env.DB.prepare(`
      SELECT 
        COUNT(*) as total_calls,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_calls,
        COUNT(CASE WHEN status = 'missed' THEN 1 END) as missed_calls,
        AVG(CASE WHEN status = 'completed' THEN duration END) as avg_duration
      FROM calls 
      WHERE user_id = ? OR partner_id = ?
    `).bind(userId, userId).first()
    
    // Get chat statistics
    const chatStats = await c.env.DB.prepare(`
      SELECT 
        COUNT(*) as total_chats,
        COUNT(CASE WHEN status = 'active' THEN 1 END) as active_chats
      FROM chats 
      WHERE user1_id = ? OR user2_id = ?
    `).bind(userId, userId).first()
    
    // Get message statistics
    const messageStats = await c.env.DB.prepare(`
      SELECT COUNT(*) as total_messages
      FROM messages 
      WHERE sender_id = ?
    `).bind(userId).first()
    
    return c.json({
      calls: callStats,
      chats: chatStats,
      messages: messageStats
    })
    
  } catch (error) {
    console.error('Failed to fetch user stats:', error)
    return c.json({ error: 'Failed to fetch user statistics' }, 500)
  }
})

// Report user
app.post('/:id/report', verifyAuth, async (c) => {
  try {
    const targetUserId = c.req.param('id')
    const reportingUserId = c.get('userId')
    const { reason, details } = await c.req.json()
    
    if (targetUserId === reportingUserId) {
      return c.json({ error: 'Cannot report yourself' }, 400)
    }
    
    if (!reason || !details) {
      return c.json({ error: 'Reason and details are required' }, 400)
    }
    
    // Insert report
    await c.env.DB.prepare(`
      INSERT INTO user_reports (reporter_id, reported_user_id, reason, details, created_at)
      VALUES (?, ?, ?, ?, datetime('now'))
    `).bind(reportingUserId, targetUserId, reason, details).run()
    
    return c.json({ message: 'User reported successfully' })
    
  } catch (error) {
    console.error('Failed to report user:', error)
    return c.json({ error: 'Failed to report user' }, 500)
  }
})

// Block user
app.post('/:id/block', verifyAuth, async (c) => {
  try {
    const targetUserId = c.req.param('id')
    const blockingUserId = c.get('userId')
    
    if (targetUserId === blockingUserId) {
      return c.json({ error: 'Cannot block yourself' }, 400)
    }
    
    // Check if already blocked
    const existingBlock = await c.env.DB.prepare(`
      SELECT id FROM user_blocks 
      WHERE blocker_id = ? AND blocked_user_id = ?
    `).bind(blockingUserId, targetUserId).first()
    
    if (existingBlock) {
      return c.json({ error: 'User is already blocked' }, 400)
    }
    
    // Insert block
    await c.env.DB.prepare(`
      INSERT INTO user_blocks (blocker_id, blocked_user_id, created_at)
      VALUES (?, ?, datetime('now'))
    `).bind(blockingUserId, targetUserId).run()
    
    return c.json({ message: 'User blocked successfully' })
    
  } catch (error) {
    console.error('Failed to block user:', error)
    return c.json({ error: 'Failed to block user' }, 500)
  }
})

// Unblock user
app.delete('/:id/block', verifyAuth, async (c) => {
  try {
    const targetUserId = c.req.param('id')
    const unblockingUserId = c.get('userId')
    
    // Remove block
    const result = await c.env.DB.prepare(`
      DELETE FROM user_blocks 
      WHERE blocker_id = ? AND blocked_user_id = ?
    `).bind(unblockingUserId, targetUserId).run()
    
    if (result.changes === 0) {
      return c.json({ error: 'User was not blocked' }, 400)
    }
    
    return c.json({ message: 'User unblocked successfully' })
    
  } catch (error) {
    console.error('Failed to unblock user:', error)
    return c.json({ error: 'Failed to unblock user' }, 500)
  }
})

// Get blocked users
app.get('/blocked/list', verifyAuth, async (c) => {
  try {
    const userId = c.get('userId')
    
    const blockedUsers = await c.env.DB.prepare(`
      SELECT 
        u.id, u.name, u.avatar_url, ub.created_at as blocked_at
      FROM user_blocks ub
      JOIN users u ON ub.blocked_user_id = u.id
      WHERE ub.blocker_id = ?
      ORDER BY ub.created_at DESC
    `).bind(userId).all()
    
    return c.json({ blockedUsers: blockedUsers.results })
    
  } catch (error) {
    console.error('Failed to fetch blocked users:', error)
    return c.json({ error: 'Failed to fetch blocked users' }, 500)
  }
})

export default app
