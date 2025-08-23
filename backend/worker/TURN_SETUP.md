# TURN Server Setup for WebRTC

## Option 1: Cloudflare Calls (Recommended if available)
Cloudflare Calls provides TURN servers as part of their service. Check if your plan includes it.

## Option 2: Free TURN Servers

### Metered TURN (Free tier available)
1. Sign up at https://www.metered.ca/stun-turn
2. Get your credentials
3. Add to your Worker environment variables:
   ```
   wrangler secret put TURN_USERNAME
   wrangler secret put TURN_CREDENTIAL
   ```

### OpenRelay (Public TURN)
```javascript
{
  urls: 'turn:openrelay.metered.ca:80',
  username: 'openrelayproject',
  credential: 'openrelayproject'
}
```

## Option 3: Self-hosted with Coturn
If you have a VPS, you can run your own TURN server using Coturn.

## Setting Environment Variables

For production, set these secrets:
```bash
# Set Auth0 credentials
wrangler secret put AUTH0_DOMAIN
wrangler secret put AUTH0_CLIENT_ID
wrangler secret put AUTH0_CLIENT_SECRET
wrangler secret put JWT_SECRET

# Set TURN credentials (optional but recommended)
wrangler secret put TURN_USERNAME
wrangler secret put TURN_CREDENTIAL

# Set frontend URL
wrangler secret put FRONTEND_URL
```

## Testing TURN Connectivity
You can test TURN servers at: https://webrtc.github.io/samples/src/content/peerconnection/trickle-ice/
