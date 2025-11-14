# Rate Limiting Configuration & Troubleshooting

## 🚨 Current Issue: 429 Too Many Requests

### Problem

You were experiencing 429 errors during development because the rate limiting was too restrictive for testing workflows.

### Solution Applied

Updated rate limiting configuration in `backend/src/server.js`:

```javascript
// Before (too restrictive)
max: 100; // requests per 15 minutes

// After (development-friendly)
max: process.env.NODE_ENV === "production" ? 200 : 1000; // requests per 15 minutes
```

## 📊 Current Rate Limits

### General API Endpoints (`/api/*`)

- **Development**: 1,000 requests per 15 minutes (~66 requests/minute)
- **Production**: 200 requests per 15 minutes (~13 requests/minute)

### Authentication Endpoints (`/api/auth/login`, `/register`, `/forgot-password`)

- **Development**: 100 requests per 15 minutes (~6 requests/minute)
- **Production**: 20 requests per 15 minutes (~1.3 requests/minute)

## 🛠️ Monitoring Rate Limits

### Check Rate Limit Headers

Every API response includes rate limit information:

```bash
curl -I http://localhost:5000/api/users/profile
```

Look for headers:

- `RateLimit-Limit`: Total requests allowed
- `RateLimit-Remaining`: Requests remaining in current window
- `RateLimit-Reset`: When the limit resets

### Test Rate Limits

Run the included test script:

```bash
cd backend
node test-rate-limit.js
```

## 🔧 Environment-Specific Configuration

### Development (.env.development)

```env
NODE_ENV=development
# Rate limits are more lenient automatically
```

### Production (.env.production)

```env
NODE_ENV=production
# Rate limits are stricter automatically
```

## 🚀 Best Practices

### For Development

1. **Use development environment** (`NODE_ENV=development`)
2. **Monitor rate limit headers** during testing
3. **Clear browser cache** if experiencing persistent issues
4. **Use different browsers/incognito** for isolated testing

### For Production

1. **Monitor rate limit metrics** in logs
2. **Implement client-side retry logic** with exponential backoff
3. **Consider user-specific rate limiting** for authenticated endpoints
4. **Set up alerts** for high rate limit usage

## 🔍 Troubleshooting

### If you still get 429 errors:

1. **Check current limits**:

   ```bash
   curl -I http://localhost:5000/health
   ```

2. **Clear rate limit cache** (restart server):

   ```bash
   npm run dev
   ```

3. **Verify environment**:

   ```bash
   echo $NODE_ENV
   ```

4. **Use different IP** (if testing from multiple devices):
   - Rate limits are per-IP address
   - Use mobile hotspot or different network

### Common Development Scenarios

**Scenario**: Login → Browse → Logout → Login → Test features  
**Requests**: ~50-100 requests  
**Status**: ✅ Now works with new limits (1000/15min)

**Scenario**: Rapid UI testing with page refreshes  
**Requests**: ~200-300 requests  
**Status**: ✅ Now works with new limits

**Scenario**: File uploads + profile updates  
**Requests**: ~20-50 requests  
**Status**: ✅ Now works with new limits

## 🎯 Future Improvements

### Potential Enhancements

1. **User-based rate limiting** instead of just IP-based
2. **Different limits for different user roles** (admin vs alumni)
3. **Sliding window** instead of fixed window
4. **Redis-based rate limiting** for distributed systems
5. **API key rate limiting** for external integrations

### Implementation Example

```javascript
// User-based rate limiting (future enhancement)
const userLimiter = rateLimit({
  keyGenerator: (req) => req.user?.id || req.ip,
  windowMs: 15 * 60 * 1000,
  max: (req) => (req.user?.role === "admin" ? 500 : 200),
});
```

## 📈 Monitoring & Analytics

### Recommended Monitoring

1. **Rate limit hit rates** by endpoint
2. **User patterns** triggering limits
3. **Geographic distribution** of requests
4. **Time-based usage patterns**

### Example Logging

```javascript
// Add to rate limiter configuration
onLimitReached: (req, res) => {
  console.log(`Rate limit exceeded for ${req.ip} on ${req.path}`);
  // Send to monitoring service
};
```
