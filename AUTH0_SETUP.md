# 🔐 Auth0 Configuration Guide

## 🚨 **Current Issue:**
Your Auth0 application is configured to redirect to a Worker endpoint that doesn't exist, causing the "Service not found" error.

## 🔧 **Solution: Configure Auth0 for Direct Frontend Integration**

### **Step 1: Go to Auth0 Dashboard**
1. Visit: https://manage.auth0.com/
2. Select your tenant: `dev-cm857sxeiz2kxcuo.uk.auth0.com`
3. Go to **Applications** → **Applications**

### **Step 2: Find Your Application**
1. Look for the application with **Client ID**: `bEyCzCji6oheSXnStmS8ay95gtWnObj6`
2. Click on it to edit

### **Step 3: Update Callback URLs**
In the **Allowed Callback URLs** field, add:
```
https://chat.pharmx.co.uk/auth/callback
```

### **Step 4: Update Allowed Logout URLs**
In the **Allowed Logout URLs** field, add:
```
https://chat.pharmx.co.uk
```

### **Step 5: Update Allowed Web Origins**
In the **Allowed Web Origins** field, add:
```
https://chat.pharmx.co.uk
```

### **Step 6: Save Changes**
Click **Save Changes** at the bottom

## ✅ **What This Fixes:**

- **Eliminates the "Service not found" error**
- **Auth0 will redirect directly to your frontend**
- **Your frontend will handle the authentication flow**
- **No more Worker callback dependency**

## 🎯 **Expected Result:**

After making these changes:
1. **Google login will work properly**
2. **Users will be redirected to `/auth/callback`**
3. **Authentication will complete successfully**
4. **Users will be taken to onboarding or main app**

## 🔄 **Alternative: Keep Worker Integration**

If you prefer to keep the Worker-based authentication:
1. Update the **Allowed Callback URLs** to include your Worker endpoint
2. Ensure your Worker's `/auth/callback` route is working
3. Test the complete flow

**Recommendation:** Use the direct frontend integration (Step 1-6) as it's simpler and more reliable. 