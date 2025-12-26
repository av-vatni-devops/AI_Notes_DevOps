# Troubleshooting Guide

## Fixed Issues

### ✅ Images Not Displaying
**Problem**: Uploaded images were not displaying in the frontend.

**Root Cause**: The nginx configuration was missing a proxy rule for `/uploads/` path.

**Solution**: Added `/uploads/` location block to `nginx.conf` to proxy image requests to the backend:
```nginx
location /uploads/ {
  proxy_pass http://backend:5000/uploads/;
  proxy_set_header Host $host;
  proxy_set_header X-Real-IP $remote_addr;
  proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
  proxy_set_header X-Forwarded-Proto $scheme;
}
```

**Status**: ✅ Fixed - Frontend image rebuilt and deployed.

---

## Known Issues & Solutions

### ⚠️ 502 Bad Gateway on AI Features

**Problem**: When trying to use AI features (expand, summarize, generate tags), you get a 502 Bad Gateway error.

**Root Cause**: The Gemini API key in `k8s/secrets.yml` is set to a placeholder value (`test-gemini-api-key-placeholder`), which is invalid.

**Solution**: 
1. Get a valid Gemini API key from https://makersuite.google.com/app/apikey
2. Update `k8s/secrets.yml` with your actual API key:
   ```yaml
   GEMINI_API_KEY: your-actual-gemini-api-key-here
   ```
3. Apply the updated secret:
   ```bash
   kubectl apply -f k8s/secrets.yml
   ```
4. Restart the backend deployment:
   ```bash
   kubectl rollout restart deployment ai-notes-backend -n ai-notes
   ```

**Note**: AI features will not work without a valid Gemini API key. The application will function normally for all other features (notes, authentication, etc.).

---

### ⚠️ JSON Parsing Error in Backend Logs

**Problem**: Backend logs show `SyntaxError: Unexpected token \ in JSON at position 1`.

**Possible Causes**:
- Malformed request body from client
- Issue with request encoding
- Problem with body-parser middleware

**Investigation**: This error appears in logs but doesn't seem to affect core functionality. If you encounter issues with specific API endpoints, check:
1. Request format in browser DevTools Network tab
2. Content-Type headers are set correctly
3. Request body is valid JSON

**Status**: ⚠️ Monitoring - Not blocking core functionality.

---

## Verification Steps

### Test Image Upload and Display
1. Upload an image in a note
2. Verify the image appears in the note editor
3. Save the note
4. Reload the page and verify the image still displays
5. Check browser DevTools Network tab - image should load from `/uploads/` path

### Test AI Features (after adding valid API key)
1. Create a note with some content
2. Click "Expand" button
3. Should see AI-generated expansion without 502 error
4. Check backend logs: `kubectl logs -n ai-notes -l app=backend --tail=50`

---

## Quick Fixes

### Update Gemini API Key
```bash
# Edit secrets file
nano k8s/secrets.yml  # or use your preferred editor

# Update GEMINI_API_KEY value
# Then apply:
kubectl apply -f k8s/secrets.yml

# Restart backend
kubectl rollout restart deployment ai-notes-backend -n ai-notes

# Verify
kubectl logs -n ai-notes -l app=backend --tail=20
```

### Check Image Proxy
```bash
# Test image serving
curl -I http://localhost:30007/uploads/image-1766741063700-225191801.jpeg

# Should return 200 OK, not 404 or 502
```

### View All Logs
```bash
# Backend logs
kubectl logs -n ai-notes -l app=backend --tail=100

# Frontend logs
kubectl logs -n ai-notes -l app=frontend --tail=100

# MongoDB logs
kubectl logs -n ai-notes -l app=mongo --tail=100
```

---

## Architecture Notes

### Image Serving Flow
```
Browser → Frontend (nginx) → /uploads/* → Backend:5000/uploads/* → Express static files
```

### API Flow
```
Browser → Frontend (nginx) → /api/* → Backend:5000/api/* → Express routes
```

Both flows go through the frontend nginx container, which proxies requests to the backend service.

