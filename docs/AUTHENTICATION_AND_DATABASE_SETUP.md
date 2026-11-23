# PolicyPilot RAG - Authentication & Database Setup Guide

This guide walks you through setting up **User Registration, Login, Google OAuth, and Persistent Chat History** using **Supabase (100% Free Tier, No Credit Card Required)**.

---

## 🏗️ Architecture Overview

```mermaid
graph TD
    User["👤 End User"]
    
    subgraph Frontend ["React UI (PolicyPilot)"]
        AuthModal["🔐 Auth Modal<br/>(Email/Password & Google One-Click)"]
        ChatUI["💬 RAG Chat Stream"]
        HistorySidebar["📜 Chat History Tab<br/>(Recent Questions & Clicks)"]
    end

    subgraph Supabase ["Supabase Free Tier (PostgreSQL + Auth)"]
        AuthService["⚡ Supabase Auth<br/>(JWT Tokens, Google OAuth, Passwords)"]
        ProfilesTable["👤 public.profiles<br/>(User Metadata & Avatars)"]
        ChatHistoryTable["💾 public.chat_history<br/>(Questions, Answers, Citations, RLS)"]
    end

    subgraph Backend ["FastAPI Backend & Vector Engine"]
        FastAPI["🚀 FastAPI REST API<br/>(Bearer Token Validation)"]
        Qdrant["🔷 Qdrant Cloud<br/>(Scoped Vector Payloads)"]
    end

    User --> AuthModal
    AuthModal -->|Google OAuth / Password| AuthService
    AuthService --> ProfilesTable
    ChatUI -->|Save Inquiry Turn| ChatHistoryTable
    HistorySidebar -->|Load Past Turns| ChatHistoryTable
    ChatUI -->|Ask Question (Bearer Token)| FastAPI
    FastAPI --> Qdrant
```

---

## Step 1: Create Your Free Supabase Project (2 Minutes)

1. Go to [https://supabase.com/](https://supabase.com/) and click **Start your project** (Sign in with GitHub).
2. Click **New Project**:
   * **Name:** `policypilot-db`
   * **Database Password:** *(Set a secure password and save it)*
   * **Region:** Choose the region nearest to you (e.g. Frankfurt, US East, Singapore).
   * **Pricing Plan:** **Free Tier ($0/month)**.
3. Click **Create new project**. Supabase provisions your PostgreSQL database in ~60 seconds.

---

## Step 2: Run the Database Schema in Supabase

1. In your Supabase project dashboard, click on the **SQL Editor** tab (icon `<_` on the left sidebar).
2. Click **New query**.
3. Open the file [`database/schema.sql`](file:///c:/Users/qudra/OneDrive/Desktop/I%20E%20C%20Bootcampl/PolicyPilot-RAG/PolicyPilot-RAG/database/schema.sql) in this repository, copy all the SQL, and paste it into the Supabase editor.
4. Click **Run** (or `Ctrl + Enter`).
5. You should see `Success. No rows returned`.
   * This creates:
     * `public.profiles` table with automatic triggers for new signups.
     * `public.user_documents` table for tracking documents per user.
     * `public.chat_history` table with Row-Level Security (RLS) so each user only sees their own questions.

---

## Step 3: Enable Google One-Click Login

### A. Get Google OAuth Credentials from Google Cloud Console
1. Go to the [Google Cloud Console](https://console.cloud.google.com/).
2. In the top bar, select an existing project or click **New Project** (e.g. `PolicyPilot-Auth`).
3. Go to **APIs & Services** > **OAuth consent screen**:
   * Select **External** > click **Create**.
   * **App name:** `PolicyPilot RAG`
   * **User support email:** *(Your Gmail address)*
   * **Developer contact email:** *(Your Gmail address)*
   * Click **Save and Continue** through the remaining screens.
4. Go to **APIs & Services** > **Credentials**:
   * Click **+ Create Credentials** > **OAuth client ID**.
   * **Application type:** **Web application**.
   * **Name:** `PolicyPilot Web Client`.
   * Under **Authorized redirect URIs**, click **+ Add URI** and paste:
     ```text
     https://<YOUR_SUPABASE_PROJECT_REF>.supabase.co/auth/v1/callback
     ```
     *(You can find your Supabase Project URL in Supabase > Project Settings > API)*.
   * Click **Create**.
   * Copy the **Client ID** and **Client Secret**.

### B. Add Google Credentials to Supabase
1. In your Supabase Dashboard, go to **Authentication** (padlock icon) > **Providers**.
2. Click on **Google**:
   * Toggle **Enable Google provider** to `ON`.
   * Paste your **Client ID**.
   * Paste your **Client Secret**.
   * Click **Save**.

---

## Step 4: Configure Your Environment Keys

1. In Supabase, go to **Project Settings** (gear icon) > **API**.
2. Copy two values:
   * **Project URL** (e.g. `https://xyzabc.supabase.co`)
   * **Project API Keys** -> `anon` `public` key (e.g. `eyJhbGciOi...`)

3. Add them to your frontend environment:
   * **Locally**: Open `.env` (or `frontend/.env`) and add:
     ```env
     VITE_SUPABASE_URL=https://xyzabc.supabase.co
     VITE_SUPABASE_ANON_KEY=your_anon_public_key_here
     ```
   * **On Render / Vercel**: In your deployment dashboard > **Environment Variables**, add:
     * `VITE_SUPABASE_URL`
     * `VITE_SUPABASE_ANON_KEY`

---

## Step 5: How It Works & What to Test

### 1. Registration & Email Sign-In
* Click the **Sign In** button in the top navigation bar.
* Switch to the **Register** tab.
* Enter Full Name, Email, and Password -> Click **Create Free Account**.
* Your user is automatically registered in Supabase and the profile avatar appears in the top header.

### 2. Login with Google
* In the Auth Modal, click **Continue with Google**.
* The Google account selector opens -> Select your Google account.
* You are seamlessly redirected back to PolicyPilot and logged in!

### 3. Persistent Chat History
* In the left sidebar, click the **History** tab.
* Whenever you ask any policy inquiry (e.g. *"What is the handwashing policy?"*), the question, answer, and citations are automatically saved to Supabase PostgreSQL under your user ID.
* Clicking any previous question from the **History** tab instantly reloads that inquiry and answer into your chat window!
* When finished, click the User Avatar in the header > **Sign Out**.
