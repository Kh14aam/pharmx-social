# PharmX Voice Social

A production-ready social web app for **chat.pharmx.co.uk** featuring 1:1 voice calling and text chats, built with Next.js 14, WebRTC, and Cloudflare Workers.

## 🚀 Features

- **Voice Calling**: Random 1:1 voice matching with "Find a Voice" button
- **User Directory**: Browse and connect with users
- **Text Chat**: WhatsApp-style messaging (text-only)
- **OAuth Authentication**: Google and Apple Sign-In only
- **Subscription Gating**: £5/month membership for messaging and direct calling
- **PWA Support**: Installable with fullscreen mode
- **Real-time Communication**: WebRTC for voice, WebSockets for chat
- **Modern UI**: GitHub + Hinge inspired design with shadcn/ui

## 🛠️ Tech Stack

### Frontend
- **Next.js 14** (App Router)
- **TypeScript**
- **Tailwind CSS** + **shadcn/ui**
- **Framer Motion** for animations
- **React Query** + **Zustand** for state management

### Backend
- **Auth.js** (NextAuth) for authentication
- **Prisma ORM** with PostgreSQL
- **Stripe** for payments
- **Cloudflare Workers** + Durable Objects for WebRTC signaling

### Infrastructure
- **Vercel** for Next.js hosting
- **Neon/Supabase** for PostgreSQL
- **Cloudflare Workers** for WebRTC signaling
- **Stripe** for subscription management

## 📋 Prerequisites

- Node.js 18+
- PostgreSQL database (Neon or Supabase)
- Stripe account
- Google OAuth credentials
- Apple Developer account (for Apple Sign-In)
- Cloudflare account (for Workers)

## 🔧 Installation

1. **Clone the repository:**
```bash
git clone https://github.com/yourusername/pharmx-voice-social.git
cd pharmx-voice-social
```

2. **Install dependencies:**
```bash
npm install
```

3. **Set up environment variables:**
Copy `.env.local` and fill in your credentials:

```env
# Database
DATABASE_URL="postgresql://..."

# Auth.js
AUTH_URL="https://chat.pharmx.co.uk"
AUTH_SECRET="generate-random-32-char-string"

# Google OAuth
AUTH_GOOGLE_ID="..."
AUTH_GOOGLE_SECRET="..."

# Apple OAuth
AUTH_APPLE_ID="..."
AUTH_APPLE_TEAM_ID="..."
AUTH_APPLE_KEY_ID="..."
AUTH_APPLE_PRIVATE_KEY="..."

# Stripe
STRIPE_SECRET_KEY="sk_..."
STRIPE_PUBLISHABLE_KEY="pk_..."
STRIPE_WEBHOOK_SECRET="whsec_..."
STRIPE_PRICE_ID="price_..."

# Cloudflare Worker
NEXT_PUBLIC_WORKER_URL="wss://your-worker.workers.dev"
```

4. **Set up the database:**
```bash
npx prisma generate
npx prisma db push
```

5. **Run development server:**
```bash
npm run dev
```

## 🚀 Deployment

### Deploy Next.js to Vercel

1. **Push to GitHub:**
```bash
git add .
git commit -m "Initial commit"
git push origin main
```

2. **Deploy to Vercel:**
- Connect your GitHub repository to Vercel
- Add all environment variables in Vercel dashboard
- Deploy

3. **Configure domain:**
- Add custom domain `chat.pharmx.co.uk` in Vercel
- Update DNS records to point to Vercel

### Deploy Cloudflare Worker

1. **Install Wrangler:**
```bash
npm install -g wrangler
```

2. **Login to Cloudflare:**
```bash
wrangler login
```

3. **Deploy Worker:**
```bash
cd worker
npm install
wrangler deploy
```

4. **Note the Worker URL** and update `NEXT_PUBLIC_WORKER_URL` in your environment variables

### Set up Stripe

1. **Create a product** in Stripe Dashboard:
   - Name: "PharmX Voice Membership"
   - Price: £5.00/month
   - Recurring: Monthly

2. **Configure webhook endpoint:**
   - URL: `https://chat.pharmx.co.uk/api/stripe/webhook`
   - Events: `checkout.session.completed`, `customer.subscription.*`

3. **Update environment variables** with your Stripe keys and price ID

### Database Setup (Neon/Supabase)

1. **Create a new project** in Neon or Supabase
2. **Copy the connection string** to `DATABASE_URL`
3. **Run migrations:**
```bash
npx prisma migrate deploy
```

## 📱 PWA Configuration

The app includes PWA support with:
- Installable on mobile devices
- Fullscreen mode toggle
- Service worker for offline support
- Add to Home Screen prompt

## 🔒 Security

- **Age verification**: Users must be 18+ (enforced at onboarding)
- **Immutable gender**: Gender cannot be changed after profile creation
- **Rate limiting**: Chat requests limited to 10/day per user
- **Block feature**: Users can block others to prevent contact
- **HTTPS required**: All connections must use HTTPS/WSS

## 📝 API Endpoints

### Authentication
- `GET/POST /api/auth/*` - Auth.js endpoints

### Profile
- `POST /api/profile` - Create/update profile
- `GET /api/profile/check` - Check if profile exists

### Users
- `GET /api/users` - List all users (paginated)

### Chat
- `POST /api/chat-requests` - Send chat request
- `POST /api/chat-requests/:id/accept` - Accept request
- `POST /api/chat-requests/:id/decline` - Decline request
- `GET /api/chats` - List conversations
- `GET /api/chats/:id/messages` - Get messages
- `POST /api/chats/:id/messages` - Send message

### Stripe
- `POST /api/stripe/checkout` - Create checkout session
- `POST /api/stripe/webhook` - Handle Stripe webhooks

## 🧪 Testing

```bash
# Run unit tests
npm test

# Run E2E tests
npm run test:e2e

# Type checking
npm run type-check

# Linting
npm run lint
```

## 📊 Monitoring

- Server logs available in Vercel dashboard
- Cloudflare Worker logs in Cloudflare dashboard
- Stripe webhooks logs in Stripe dashboard

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is proprietary and confidential.

## 🆘 Support

For issues or questions, contact: support@pharmx.co.uk

## 🎯 Acceptance Criteria Checklist

- [x] Landing page with Google/Apple OAuth
- [x] Onboarding with profile creation
- [x] Three main tabs: Voice, Users, Chats
- [x] Voice matching with Find a Voice button
- [x] WebRTC voice calling
- [x] User directory with profiles
- [ ] Stripe subscription gating
- [ ] Chat request system
- [ ] Text messaging
- [ ] Settings screens
- [ ] PWA features
- [x] Cloudflare Worker for signaling

## 🔮 Future Enhancements

- Advanced matchmaking filters (language, age, interests)
- Typing indicators and read receipts
- Voice quality monitoring
- Call recording (with consent)
- Group voice rooms
- Media messaging support
