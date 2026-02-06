# 🚀 NoveXa Deployment Guide

This project is structured for easy deployment on **Render** (Backend) and **Vercel** (Frontend).

## 🛠️ Backend Deployment (Render.com)
1. **New Web Service** → Connect this Repository.
2. **Root Directory**: `manel-backend`
3. **Build Command**: `npm install`
4. **Start Command**: `node src/server.js`
5. **Environment Variables**: Add your `.env` keys (DATABASE_URL, JWT_SECRET, etc.)

## 🌐 Frontend Deployment (Vercel.com)
1. **New Project** → Connect this Repository.
2. **Root Directory**: `frontend`
3. **Build Settings**: No build step needed.
4. **Output Directory**: `.`
5. **Environment Variables**: Add `BASE_URL` pointing to your Render backend (e.g., `https://your-backend.onrender.com/api`).

---
Developed with ❤️ by NoveXa Team.
