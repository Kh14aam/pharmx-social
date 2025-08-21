import { Hono } from 'hono'
import type { Env } from '../index'
import { verifyAuth } from '../middleware/auth'

export const chatsRoutes = new Hono<{ Bindings: Env }>()

// Get user's chats
chatsRoutes.get('/', verifyAuth, async (c) => {
  const userId = c.get('userId')
  
  try {
    const result = await c.env.DB.prepare(
      `SELECT c.*, 
        u.name as other_user_name, 
        u.avatar as other_user_avatar,
        m.content as last_message,
        m.created_at as last_message_time
       FROM chats c
       JOIN users u ON (u.id = c.user1_id OR u.id = c.user2_id) AND u.id != ?
       LEFT JOIN messages m ON m.id = c.last_message_id
       WHERE c.user1_id = ? OR c.user2_id = ?
       ORDER BY m.created_at DESC`
    ).bind(userId, userId, userId).all()
    
    return c.json({
      chats: result.results
    })
  } catch (error) {
    console.error('Error fetching chats:', error)
    return c.json({ error: 'Failed to fetch chats' }, 500)
  }
})

// Get specific chat messages
chatsRoutes.get('/:chatId/messages', verifyAuth, async (c) => {
  const chatId = c.req.param('chatId')
  const userId = c.get('userId')
  const limit = parseInt(c.req.query('limit') || '50')
  const offset = parseInt(c.req.query('offset') || '0')
  
  try {
    // Verify user is part of this chat
    const chat = await c.env.DB.prepare(
      'SELECT * FROM chats WHERE id = ? AND (user1_id = ? OR user2_id = ?)'
    ).bind(chatId, userId, userId).first()
    
    if (!chat) {
      return c.json({ error: 'Chat not found or unauthorized' }, 404)
    }
    
    const messages = await c.env.DB.prepare(
      `SELECT m.*, u.name as sender_name, u.avatar as sender_avatar
       FROM messages m
       JOIN users u ON u.id = m.sender_id
       WHERE m.chat_id = ?
       ORDER BY m.created_at DESC
       LIMIT ? OFFSET ?`
    ).bind(chatId, limit, offset).all()
    
    return c.json({
      messages: messages.results.reverse() // Reverse to get chronological order
    })
  } catch (error) {
    console.error('Error fetching messages:', error)
    return c.json({ error: 'Failed to fetch messages' }, 500)
  }
})

// Send message
chatsRoutes.post('/:chatId/messages', verifyAuth, async (c) => {
  const chatId = c.req.param('chatId')
  const userId = c.get('userId')
  const { content } = await c.req.json()
  
  if (!content) {
    return c.json({ error: 'Message content required' }, 400)
  }
  
  try {
    // Verify user is part of this chat
    const chat = await c.env.DB.prepare(
      'SELECT * FROM chats WHERE id = ? AND (user1_id = ? OR user2_id = ?)'
    ).bind(chatId, userId, userId).first()
    
    if (!chat) {
      return c.json({ error: 'Chat not found or unauthorized' }, 404)
    }
    
    // Insert message
    const messageId = crypto.randomUUID()
    await c.env.DB.prepare(
      `INSERT INTO messages (id, chat_id, sender_id, content, created_at)
       VALUES (?, ?, ?, ?, datetime('now'))`
    ).bind(messageId, chatId, userId, content).run()
    
    // Update chat's last message
    await c.env.DB.prepare(
      'UPDATE chats SET last_message_id = ?, updated_at = datetime("now") WHERE id = ?'
    ).bind(messageId, chatId).run()
    
    return c.json({
      id: messageId,
      chat_id: chatId,
      sender_id: userId,
      content,
      created_at: new Date().toISOString()
    })
  } catch (error) {
    console.error('Error sending message:', error)
    return c.json({ error: 'Failed to send message' }, 500)
  }
})

// Create new chat
chatsRoutes.post('/', verifyAuth, async (c) => {
  const userId = c.get('userId')
  const { otherUserId } = await c.req.json()
  
  if (!otherUserId) {
    return c.json({ error: 'Other user ID required' }, 400)
  }
  
  try {
    // Check if chat already exists
    const existing = await c.env.DB.prepare(
      `SELECT * FROM chats 
       WHERE (user1_id = ? AND user2_id = ?) 
       OR (user1_id = ? AND user2_id = ?)`
    ).bind(userId, otherUserId, otherUserId, userId).first()
    
    if (existing) {
      return c.json(existing)
    }
    
    // Create new chat
    const chatId = crypto.randomUUID()
    await c.env.DB.prepare(
      `INSERT INTO chats (id, user1_id, user2_id, created_at)
       VALUES (?, ?, ?, datetime('now'))`
    ).bind(chatId, userId, otherUserId).run()
    
    return c.json({
      id: chatId,
      user1_id: userId,
      user2_id: otherUserId,
      created_at: new Date().toISOString()
    })
  } catch (error) {
    console.error('Error creating chat:', error)
    return c.json({ error: 'Failed to create chat' }, 500)
  }
})
