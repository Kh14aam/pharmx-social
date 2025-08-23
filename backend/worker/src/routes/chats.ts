import { Hono } from 'hono'
import { verifyAuth } from '../middleware/auth'
import { moderateRateLimit } from '../middleware/rate-limit'
import type { Env } from '../index'

const app = new Hono<{ Bindings: Env }>()

// Apply rate limiting to all chat routes
app.use('*', moderateRateLimit)

// Get all chats for a user
app.get('/', verifyAuth, async (c) => {
  try {
    const userId = c.get('userId')
    const { tab = 'messages' } = c.req.query()
    
    if (tab === 'requests') {
      // Get incoming chat requests
      const requests = await c.env.DB.prepare(`
        SELECT 
          cr.id, cr.sender_id, cr.receiver_id, cr.message, cr.created_at,
          u.name as sender_name, u.avatar_url as sender_avatar, u.bio as sender_bio
        FROM chat_requests cr
        JOIN users u ON cr.sender_id = u.id
        WHERE cr.receiver_id = ? AND cr.status = 'pending'
        ORDER BY cr.created_at DESC
      `).bind(userId).all()
      
      return c.json({ requests: requests.results })
    } else {
      // Get active chats
      const chats = await c.env.DB.prepare(`
        SELECT 
          c.id, c.user1_id, c.user2_id, c.status, c.created_at, c.updated_at,
          CASE 
            WHEN c.user1_id = ? THEN c.user2_id 
            ELSE c.user1_id 
          END as partner_id,
          u.name as partner_name, u.avatar_url as partner_avatar,
          (
            SELECT m.content 
            FROM messages m 
            WHERE m.chat_id = c.id 
            ORDER BY m.created_at DESC 
            LIMIT 1
          ) as last_message,
          (
            SELECT m.created_at 
            FROM messages m 
            WHERE m.chat_id = c.id 
            ORDER BY m.created_at DESC 
            LIMIT 1
          ) as last_message_time,
          (
            SELECT COUNT(*) 
            FROM messages m 
            WHERE m.chat_id = c.id 
            AND m.sender_id != ? 
            AND m.read_at IS NULL
          ) as unread_count
        FROM chats c
        JOIN users u ON (
          CASE 
            WHEN c.user1_id = ? THEN c.user2_id 
            ELSE c.user1_id 
          END = u.id
        )
        WHERE (c.user1_id = ? OR c.user2_id = ?) 
        AND c.status = 'active'
        ORDER BY c.updated_at DESC
      `).bind(userId, userId, userId, userId, userId).all()
      
      return c.json({ chats: chats.results })
    }
    
  } catch (error) {
    console.error('Failed to fetch chats:', error)
    return c.json({ error: 'Failed to fetch chats' }, 500)
  }
})

// Get specific chat with messages
app.get('/:id', verifyAuth, async (c) => {
  try {
    const chatId = c.req.param('id')
    const userId = c.get('userId')
    
    // Verify user has access to this chat
    const chat = await c.env.DB.prepare(`
      SELECT id, user1_id, user2_id, status, created_at
      FROM chats 
      WHERE id = ? AND (user1_id = ? OR user2_id = ?)
    `).bind(chatId, userId, userId).first()
    
    if (!chat) {
      return c.json({ error: 'Chat not found or access denied' }, 404)
    }
    
    // Get chat partner info
    const partnerId = chat.user1_id === userId ? chat.user2_id : chat.user1_id
    const partner = await c.env.DB.prepare(`
      SELECT id, name, avatar_url, bio
      FROM users 
      WHERE id = ?
    `).bind(partnerId).first()
    
    // Get messages with pagination
    const { page = '1', limit = '50' } = c.req.query()
    const pageNum = parseInt(page) || 1
    const limitNum = Math.min(parseInt(limit) || 50, 100)
    const offset = (pageNum - 1) * limitNum
    
    const messages = await c.env.DB.prepare(`
      SELECT 
        m.id, m.sender_id, m.content, m.type, m.created_at, m.read_at,
        u.name as sender_name, u.avatar_url as sender_avatar
      FROM messages m
      JOIN users u ON m.sender_id = u.id
      WHERE m.chat_id = ?
      ORDER BY m.created_at DESC
      LIMIT ? OFFSET ?
    `).bind(chatId, limitNum, offset).all()
    
    // Mark messages as read
    await c.env.DB.prepare(`
      UPDATE messages 
      SET read_at = datetime('now')
      WHERE chat_id = ? AND sender_id != ? AND read_at IS NULL
    `).bind(chatId, userId).run()
    
    return c.json({
      chat: {
        id: chat.id,
        status: chat.status,
        createdAt: chat.created_at,
        partner: {
          id: partner.id,
          name: partner.name,
          avatarUrl: partner.avatar_url,
          bio: partner.bio
        }
      },
      messages: messages.results.reverse(), // Reverse to show oldest first
      pagination: {
        page: pageNum,
        limit: limitNum,
        hasNext: messages.results.length === limitNum
      }
    })
    
  } catch (error) {
    console.error('Failed to fetch chat:', error)
    return c.json({ error: 'Failed to fetch chat' }, 500)
  }
})

// Send message in chat
app.post('/:id/messages', verifyAuth, async (c) => {
  try {
    const chatId = c.req.param('id')
    const userId = c.get('userId')
    const { content, type = 'text' } = await c.req.json()
    
    if (!content || content.trim().length === 0) {
      return c.json({ error: 'Message content is required' }, 400)
    }
    
    if (content.length > 1000) {
      return c.json({ error: 'Message too long (max 1000 characters)' }, 400)
    }
    
    // Verify user has access to this chat
    const chat = await c.env.DB.prepare(`
      SELECT id, user1_id, user2_id, status
      FROM chats 
      WHERE id = ? AND (user1_id = ? OR user2_id = ?) AND status = 'active'
    `).bind(chatId, userId, userId).first()
    
    if (!chat) {
      return c.json({ error: 'Chat not found or access denied' }, 404)
    }
    
    // Insert message
    const result = await c.env.DB.prepare(`
      INSERT INTO messages (chat_id, sender_id, content, type, created_at)
      VALUES (?, ?, ?, ?, datetime('now'))
    `).bind(chatId, userId, content.trim(), type).run()
    
    if (result.changes === 0) {
      return c.json({ error: 'Failed to send message' }, 500)
    }
    
    // Update chat's updated_at timestamp
    await c.env.DB.prepare(`
      UPDATE chats 
      SET updated_at = datetime('now')
      WHERE id = ?
    `).bind(chatId).run()
    
    // Get the sent message
    const message = await c.env.DB.prepare(`
      SELECT 
        m.id, m.sender_id, m.content, m.type, m.created_at, m.read_at,
        u.name as sender_name, u.avatar_url as sender_avatar
      FROM messages m
      JOIN users u ON m.sender_id = u.id
      WHERE m.id = ?
    `).bind(result.lastRowId).first()
    
    return c.json({ message })
    
  } catch (error) {
    console.error('Failed to send message:', error)
    return c.json({ error: 'Failed to send message' }, 500)
  }
})

// Send chat request
app.post('/request', verifyAuth, async (c) => {
  try {
    const senderId = c.get('userId')
    const { receiverId, message } = await c.req.json()
    
    if (!receiverId) {
      return c.json({ error: 'Receiver ID is required' }, 400)
    }
    
    if (senderId === receiverId) {
      return c.json({ error: 'Cannot send request to yourself' }, 400)
    }
    
    if (message && message.length > 200) {
      return c.json({ error: 'Request message too long (max 200 characters)' }, 400)
    }
    
    // Check if receiver exists
    const receiver = await c.env.DB.prepare(`
      SELECT id FROM users WHERE id = ?
    `).bind(receiverId).first()
    
    if (!receiver) {
      return c.json({ error: 'Receiver not found' }, 404)
    }
    
    // Check if chat already exists
    const existingChat = await c.env.DB.prepare(`
      SELECT id FROM chats 
      WHERE (user1_id = ? AND user2_id = ?) OR (user1_id = ? AND user2_id = ?)
    `).bind(senderId, receiverId, receiverId, senderId).first()
    
    if (existingChat) {
      return c.json({ error: 'Chat already exists' }, 400)
    }
    
    // Check if request already exists
    const existingRequest = await c.env.DB.prepare(`
      SELECT id FROM chat_requests 
      WHERE sender_id = ? AND receiver_id = ? AND status = 'pending'
    `).bind(senderId, receiverId).first()
    
    if (existingRequest) {
      return c.json({ error: 'Request already sent' }, 400)
    }
    
    // Insert chat request
    const result = await c.env.DB.prepare(`
      INSERT INTO chat_requests (sender_id, receiver_id, message, status, created_at)
      VALUES (?, ?, ?, 'pending', datetime('now'))
    `).bind(senderId, receiverId, message || null).run()
    
    if (result.changes === 0) {
      return c.json({ error: 'Failed to send request' }, 500)
    }
    
    return c.json({ 
      message: 'Chat request sent successfully',
      requestId: result.lastRowId
    })
    
  } catch (error) {
    console.error('Failed to send chat request:', error)
    return c.json({ error: 'Failed to send chat request' }, 500)
  }
})

// Accept/decline chat request
app.post('/request/:id/:action', verifyAuth, async (c) => {
  try {
    const requestId = c.req.param('id')
    const action = c.req.param('action')
    const userId = c.get('userId')
    
    if (!['accept', 'decline'].includes(action)) {
      return c.json({ error: 'Invalid action. Use "accept" or "decline"' }, 400)
    }
    
    // Get request details
    const request = await c.env.DB.prepare(`
      SELECT id, sender_id, receiver_id, message, status
      FROM chat_requests 
      WHERE id = ? AND receiver_id = ? AND status = 'pending'
    `).bind(requestId, userId).first()
    
    if (!request) {
      return c.json({ error: 'Request not found or access denied' }, 404)
    }
    
    if (action === 'accept') {
      // Create chat
      const chatResult = await c.env.DB.prepare(`
        INSERT INTO chats (user1_id, user2_id, status, created_at, updated_at)
        VALUES (?, ?, 'active', datetime('now'), datetime('now'))
      `).bind(request.sender_id, request.receiver_id).run()
      
      if (chatResult.changes === 0) {
        return c.json({ error: 'Failed to create chat' }, 500)
      }
      
      // If there was a message, add it to the chat
      if (request.message) {
        await c.env.DB.prepare(`
          INSERT INTO messages (chat_id, sender_id, content, type, created_at)
          VALUES (?, ?, ?, 'text', datetime('now'))
        `).bind(chatResult.lastRowId, request.sender_id, request.message).run()
      }
      
      // Update request status
      await c.env.DB.prepare(`
        UPDATE chat_requests 
        SET status = 'accepted', updated_at = datetime('now')
        WHERE id = ?
      `).bind(requestId).run()
      
      return c.json({ 
        message: 'Chat request accepted',
        chatId: chatResult.lastRowId
      })
      
    } else {
      // Decline request
      await c.env.DB.prepare(`
        UPDATE chat_requests 
        SET status = 'declined', updated_at = datetime('now')
        WHERE id = ?
      `).bind(requestId).run()
      
      return c.json({ message: 'Chat request declined' })
    }
    
  } catch (error) {
    console.error('Failed to process chat request:', error)
    return c.json({ error: 'Failed to process request' }, 500)
  }
})

// Delete chat
app.delete('/:id', verifyAuth, async (c) => {
  try {
    const chatId = c.req.param('id')
    const userId = c.get('userId')
    
    // Verify user has access to this chat
    const chat = await c.env.DB.prepare(`
      SELECT id FROM chats 
      WHERE id = ? AND (user1_id = ? OR user2_id = ?)
    `).bind(chatId, userId, userId).first()
    
    if (!chat) {
      return c.json({ error: 'Chat not found or access denied' }, 404)
    }
    
    // Soft delete by setting status to deleted
    await c.env.DB.prepare(`
      UPDATE chats 
      SET status = 'deleted', updated_at = datetime('now')
      WHERE id = ?
    `).bind(chatId).run()
    
    return c.json({ message: 'Chat deleted successfully' })
    
  } catch (error) {
    console.error('Failed to delete chat:', error)
    return c.json({ error: 'Failed to delete chat' }, 500)
  }
})

// Search messages in chat
app.get('/:id/search', verifyAuth, async (c) => {
  try {
    const chatId = c.req.param('id')
    const userId = c.get('userId')
    const { q: query, page = '1', limit = '20' } = c.req.query()
    
    if (!query || query.trim().length === 0) {
      return c.json({ error: 'Search query is required' }, 400)
    }
    
    // Verify user has access to this chat
    const chat = await c.env.DB.prepare(`
      SELECT id FROM chats 
      WHERE id = ? AND (user1_id = ? OR user2_id = ?)
    `).bind(chatId, userId, userId).first()
    
    if (!chat) {
      return c.json({ error: 'Chat not found or access denied' }, 404)
    }
    
    const pageNum = parseInt(page) || 1
    const limitNum = Math.min(parseInt(limit) || 20, 100)
    const offset = (pageNum - 1) * limitNum
    
    // Search messages
    const messages = await c.env.DB.prepare(`
      SELECT 
        m.id, m.sender_id, m.content, m.type, m.created_at,
        u.name as sender_name, u.avatar_url as sender_avatar
      FROM messages m
      JOIN users u ON m.sender_id = u.id
      WHERE m.chat_id = ? AND m.content LIKE ?
      ORDER BY m.created_at DESC
      LIMIT ? OFFSET ?
    `).bind(chatId, `%${query.trim()}%`, limitNum, offset).all()
    
    return c.json({
      messages: messages.results,
      query: query.trim(),
      pagination: {
        page: pageNum,
        limit: limitNum,
        hasNext: messages.results.length === limitNum
      }
    })
    
  } catch (error) {
    console.error('Failed to search messages:', error)
    return c.json({ error: 'Failed to search messages' }, 500)
  }
})

export default app
