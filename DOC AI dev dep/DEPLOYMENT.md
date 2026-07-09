# DocAI Deployment Guide

## 🚨 Important: Deployment Architecture

**Vercel cannot host Django backends.** You need to deploy the frontend and backend separately:

- **Frontend (Next.js)**: Deploy to Vercel
- **Backend (Django)**: Deploy to Railway, Render, or DigitalOcean

## 🎯 Recommended Deployment Strategy

### Step 1: Deploy Backend to Railway

1. **Create Railway Account**
   - Go to [railway.app](https://railway.app)
   - Sign up with GitHub

2. **Deploy Backend**
   ```bash
   # In your project root
   cd backend
   railway login
   railway init
   railway up
   ```

3. **Set Environment Variables in Railway**
   ```
   DJANGO_SECRET_KEY=your-super-secret-key-here
   DJANGO_DEBUG=False
   DATABASE_URL=postgresql://... (Railway will provide this)
   FRONTEND_URL=https://your-frontend.vercel.app
   DJANGO_ALLOWED_HOSTS=your-backend.railway.app
   DJANGO_CSRF_TRUSTED_ORIGINS=https://your-frontend.vercel.app
   ```

4. **Get Backend URL**
   - Railway will give you a URL like: `https://your-project.railway.app`

### Step 2: Deploy Frontend to Vercel

1. **Push to GitHub**
   ```bash
   git add .
   git commit -m "Prepare for deployment"
   git push origin main
   ```

2. **Connect to Vercel**
   - Go to [vercel.com](https://vercel.com)
   - Import your GitHub repository
   - Set root directory to `frontend`

3. **Set Environment Variables in Vercel**
   ```
   DJANGO_API_URL=https://your-backend.railway.app
   NEXTAUTH_SECRET=your-super-secret-key-here
   NEXTAUTH_URL=https://your-frontend.vercel.app
   ```

4. **Deploy**
   - Vercel will automatically build and deploy

## 🔧 Alternative: Full-Stack on Railway

If you prefer a single deployment:

1. **Deploy entire project to Railway**
   ```bash
   railway init
   railway up
   ```

2. **Configure Railway for both frontend and backend**
   - Railway supports both Django and Next.js
   - Set up proper build commands for both

## 📋 Environment Variables Checklist

### Backend (Railway/Render)
- ✅ `DJANGO_SECRET_KEY`
- ✅ `DJANGO_DEBUG=False`
- ✅ `DATABASE_URL` (PostgreSQL)
- ✅ `FRONTEND_URL` (Vercel URL)
- ✅ `DJANGO_ALLOWED_HOSTS`
- ✅ `DJANGO_CSRF_TRUSTED_ORIGINS`

### Frontend (Vercel)
- ✅ `DJANGO_API_URL` (Railway backend URL)
- ✅ `NEXTAUTH_SECRET`
- ✅ `NEXTAUTH_URL` (Vercel URL)

## 🗄️ Database Setup

### Option 1: Railway PostgreSQL (Recommended)
- Railway provides PostgreSQL automatically
- Just set `DATABASE_URL` environment variable

### Option 2: External Database
- Use Supabase, PlanetScale, or Neon
- Set `DATABASE_URL` to external database

## 🚀 Deployment Commands

### Backend Migrations
```bash
# After backend deployment
railway run python manage.py migrate
railway run python manage.py createsuperuser
```

### Frontend Build
```bash
# Vercel handles this automatically
npm run build
```

## 🔍 Testing Deployment

1. **Test Backend Health**
   ```
   GET https://your-backend.railway.app/api/healthz/
   ```

2. **Test Frontend**
   ```
   Visit https://your-frontend.vercel.app
   ```

3. **Test API Connection**
   - Try logging in
   - Create a document
   - Verify real-time collaboration works

## 🛠️ Troubleshooting

### Common Issues

1. **CORS Errors**
   - Check `DJANGO_CSRF_TRUSTED_ORIGINS`
   - Verify `FRONTEND_URL` matches Vercel domain

2. **Database Connection**
   - Ensure `DATABASE_URL` is set correctly
   - Run migrations: `railway run python manage.py migrate`

3. **Environment Variables**
   - Double-check all environment variables are set
   - Restart services after changing environment variables

### Logs
- **Railway**: Check logs in Railway dashboard
- **Vercel**: Check function logs in Vercel dashboard

## 📞 Support

If you encounter issues:
1. Check the logs in both Railway and Vercel
2. Verify environment variables are set correctly
3. Ensure database migrations have run
4. Test API endpoints directly
