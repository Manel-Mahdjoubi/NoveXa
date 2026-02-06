# 🌍 The NoveXa Hosting Guide (Beginner Friendly)

Since you've never hosted a website before, don't worry! This guide will take you from "Local" (only on your PC) to "Live" (anyone with the link can see it).

## 💡 The Concept
To host NoveXa, we need to host two parts:
1.  **The Backend (The Brain)**: This handles your users, login, and database. We will use **Render**.
2.  **The Frontend (The Face)**: This is what people see. We will use **Vercel**.

---

## 🛠️ Phase 1: Hosting the "Brain" (Backend)

We will use [Render.com](https://render.com). It is free and works great with Node.js.

### 1. Create an account
*   Go to [Render.com](https://render.com) and click **Sign Up**.
*   **Important**: Use the **"Sign up with GitHub"** option. This makes everything much easier.

### 2. Create a "Web Service"
*   In your Render dashboard, click the blue **New +** button and select **Web Service**.
*   You will see a list of your GitHub repositories. Click **Connect** next to `Manel-Mahdjoubi/NoveXa`.

### 3. Configure the settings
Render will ask for some details. Fill them in exactly like this:
*   **Name**: `novexa-backend`
*   **Region**: (Pick the one closest to you, e.g., Frankfurt or Ohio)
*   **Branch**: `main`
*   **Root Directory**: `manel-backend`  <-- *Very important!*
*   **Runtime**: `Node`
*   **Build Command**: `npm install && npx prisma generate`
*   **Start Command**: `node src/server.js`

### 4. Add your Environment Variables (The Secret Keys)
This is where you tell the online server your database link and Cloudinary keys:
*   Click the **Advanced** button or the **Environment** tab.
*   Click **Add Environment Variable**.
*   Copy every single line from your local `.env` file. For example:
    *   Key: `DATABASE_URL` | Value: (Your Neon database link)
    *   Key: `JWT_SECRET` | Value: `manelsupersecretkey1`
    *   ... (Do this for Cloudinary, Google Drive, and Email keys).

### 5. Deploy
*   Click **Create Web Service**.
*   Render will start building. Watch the logs! Once it says **"Live"**, copy the URL it gives you (e.g., `https://novexa-backend.onrender.com`). **Save this URL!**

---

## 🎨 Phase 2: Hosting the "Face" (Frontend)

We will use [Vercel.com](https://vercel.com). It is the fastest way to host HTML/CSS.

### 1. Create an account
*   Go to [Vercel.com](https://vercel.com) and sign up using **GitHub**.

### 2. Import Project
*   Click **Add New...** → **Project**.
*   Find `Manel-Mahdjoubi/NoveXa` and click **Import**.

### 3. Configure the settings
*   **Project Name**: `novexa-online`
*   **Framework Preset**: Select `Other` (since it's plain HTML).
*   **Root Directory**: Click "Edit" and select the **`frontend`** folder. <-- *Very important!*

### 4. Deploy
*   Click **Deploy**.
*   In 10 seconds, your site will be live! Vercel will give you a link like `https://novexa-online.vercel.app`.

---

## 🔗 Phase 3: Connecting the Parts (The Glue)

Right now, your online website is still trying to talk to `localhost:3000` (your computer). We need to tell it to talk to the Render Link instead.

1.  Open your project in VS Code.
2.  Go to `frontend/js/api-config.js`.
3.  Change line 3 to use your **Render Link** instead:
    ```javascript
    // Change this:
    BASE_URL: 'http://localhost:3000/api',
    
    // To this (Insert your actual Render URL here):
    BASE_URL: 'https://novexa-backend.onrender.com/api',
    ```
4.  **Save the file**.
5.  Push your changes to GitHub:
    ```powershell
    git add .
    git commit -m "Update API URL for hosting"
    git push origin main
    ```
6.  **Sit back and relax!** Vercel and Render will see the update and refresh your website automatically.

---

### ✅ You are Live!
Open your Vercel link, and you should see the NoveXa homepage. Try logging in—it's now officially on the internet!
