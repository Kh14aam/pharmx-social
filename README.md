# PharmX Social

A modern social voice chat application built with Next.js, Cloudflare Workers, and Durable Objects.

## 🌟 Features

- **Voice Chat**: Real-time voice calls with WebRTC
- **User Profiles**: Complete profile management with avatar upload
- **Messaging**: Text chat with message history
- **Authentication**: Secure Google OAuth integration
- **Real-time**: WebSocket-based live features
- **Serverless**: Fully serverless architecture on Cloudflare

## 🏗️ Architecture

- **Frontend**: Next.js 14 with TypeScript and Tailwind CSS
- **Backend**: Cloudflare Workers with Hono framework
- **Database**: Cloudflare D1 (SQLite)
- **Storage**: Cloudflare R2 for avatars
- **Real-time**: Durable Objects for live features
- **Authentication**: Direct Google OAuth
- **Deployment**: Cloudflare Pages + Workers

## 📋 Prerequisites

- Node.js 18+ and npm
- Cloudflare account with Workers plan
- Google Cloud Console account for OAuth
- Git for version control

## 🚀 Quick Start

### 1. Clone and Install

```bash
git clone <your-repo-url>
cd pharmx-social
npm install
```

### 2. Environment Setup

Create `.env.local`:

```bash
# API Configuration
NEXT_PUBLIC_API_URL=https://your-worker.workers.dev/api/v1

# Database (for local development)
DATABASE_URL=your-database-url
```

### 3. Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project or select existing
3. Enable Google+ API
4. Create OAuth 2.0 credentials:
   - **Type**: Web application
   - **Authorized JavaScript origins**: `https://your-domain.com`
   - **Authorized redirect URIs**: `https://your-worker.workers.dev/login/callback`

### 4. Worker Configuration

In your Cloudflare Worker settings, add these secrets:

```bash
# Google OAuth secrets
wrangler secret put GOOGLE_CLIENT_ID
wrangler secret put GOOGLE_CLIENT_SECRET
wrangler secret put GOOGLE_REDIRECT_URI

# Application secrets
wrangler secret put JWT_SECRET
```

Set these environment variables:
```toml
# In wrangler.toml [vars] section
FRONTEND_URL = "https://your-pages-domain.pages.dev"
```

### 5. Database Setup

```bash
# Create D1 database
wrangler d1 create pharmx-social-db

# Run migrations
wrangler d1 execute pharmx-social-db --local --file=./pharmx-worker-api/schema.sql
wrangler d1 execute pharmx-social-db --file=./pharmx-worker-api/schema.sql
```

### 6. Deploy

```bash
# Deploy Worker
cd pharmx-worker-api
wrangler deploy

# Deploy Frontend
cd ..
npm run build
# Push to GitHub for automatic Cloudflare Pages deployment
```

## 🔧 Development

### Local Development

```bash
# Start frontend
npm run dev

# Start worker (in separate terminal)
cd pharmx-worker-api
wrangler dev
```

### Testing

```bash
# Run linting
npm run lint

# Test API endpoints
curl https://your-worker.workers.dev/health
```

## 🏗️ Project Structure

```
├── app/                    # Next.js app directory
│   ├── login/             # Login page
│   ├── auth/callback/     # OAuth callback
│   ├── onboarding/        # User onboarding
│   └── app/               # Main application
├── components/            # React components
├── pharmx-worker-api/     # Cloudflare Worker
│   ├── src/               # Worker source code
│   ├── schema.sql         # Database schema
│   └── wrangler.toml      # Worker configuration
└── lib/                   # Shared utilities
```

## 🔒 Security Features

- JWT token validation
- Rate limiting on API endpoints
- Input validation and sanitization
- CORS protection
- Secure OAuth flow with PKCE
- Environment variable protection

## 📊 Monitoring

Health check endpoints:
- `/health` - Basic health status
- `/api/v1/health/detailed` - Detailed system status
- `/api/v1/health/metrics` - Application metrics

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🛠️ Troubleshooting

### Common Issues

1. **OAuth Failures**: Verify Google OAuth configuration and redirect URIs
2. **Database Errors**: Check D1 database permissions and schema
3. **CORS Issues**: Verify allowed origins in Worker configuration
4. **Build Failures**: Check Node.js version and dependencies

### Debug Mode

Enable debug logging by setting `DEBUG=true` in your environment.

### Getting Help

- Check the [Issues](https://github.com/your-org/pharmx-social/issues) page
- Review Cloudflare Workers [documentation](https://developers.cloudflare.com/workers/)
- Consult Next.js [documentation](https://nextjs.org/docs)

---

Built with ❤️ using Cloudflare's edge computing platform
