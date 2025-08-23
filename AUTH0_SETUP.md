# Auth0 Setup Guide for PharmX Social

## 🚨 **CRITICAL: Fix the "Bulky Box" Issue**

The "bulky box" you're seeing is Auth0's universal login page. This happens when Auth0 isn't configured to go directly to Google.

## 🔧 **Step 1: Fix Auth0 Dashboard Settings**

### **1.1 Allowed Callback URLs**
Set to: `https://chat.pharmx.co.uk/auth/callback`

### **1.2 Allowed Logout URLs** 
Set to: `https://chat.pharmx.co.uk`

### **1.3 Allowed Web Origins**
Set to: `https://chat.pharmx.co.uk`

### **1.4 ⭐ CRITICAL: Application Login Experience**

**In your Auth0 Dashboard:**
1. Go to **Applications** → **pharmx-social** → **Settings**
2. Scroll down to **Application Login Experience**
3. **Turn OFF** "Customize Login Page"
4. **Turn OFF** "Customize Signup Page"
5. **Turn OFF** "Customize Error Page"

### **1.5 ⭐ CRITICAL: Social Connections**

**In your Auth0 Dashboard:**
1. Go to **Authentication** → **Social**
2. Click on **Google**
3. **Turn ON** "Requires Email"
4. **Turn ON** "Requires Username"
5. **Save**

### **1.6 ⭐ CRITICAL: Application Type**

**In your Auth0 Dashboard:**
1. Go to **Applications** → **pharmx-social** → **Settings**
2. **Application Type**: Set to `Single Page Application`
3. **Token Endpoint Authentication Method**: Set to `None`
4. **Save**

## 🔧 **Step 2: Fix API Configuration**

### **2.1 Create API in Auth0**
1. Go to **Applications** → **APIs**
2. Click **+ Create API**
3. **Name**: `PharmX API`
4. **Identifier**: `https://pharmx-api.kasimhussain333.workers.dev`
5. **Signing Algorithm**: `RS256`
6. **Save**

### **2.2 API Permissions**
1. Go to **Applications** → **APIs** → **PharmX API** → **Permissions**
2. Add these permissions:
   - `read:profile`
   - `write:profile`
   - `read:users`
   - `write:chats`

## 🔧 **Step 3: Test the Fix**

1. **Clear your browser cache and cookies**
2. **Go to**: `https://chat.pharmx.co.uk/login`
3. **Click "Continue with Google"**
4. **Should go directly to Google** (no bulky box!)
5. **After Google auth, should redirect to onboarding**

## 🚨 **If Still Not Working:**

### **Check Browser Console for Errors:**
- Look for Auth0 errors
- Check network requests
- Look for redirect loops

### **Common Issues:**
1. **Wrong Application Type** (should be SPA, not Regular Web App)
2. **Custom Login Page enabled** (causes bulky box)
3. **Wrong callback URLs** (causes redirect loops)
4. **Missing API configuration** (causes auth failures)

## 📞 **Need Help?**

If the issue persists after following these steps, please:
1. **Screenshot the Auth0 dashboard settings**
2. **Share browser console errors**
3. **Describe exactly what happens** when clicking "Continue with Google"

---

**The goal**: Click "Continue with Google" → Go directly to Google → No bulky box → Smooth redirect to onboarding! 🎯 