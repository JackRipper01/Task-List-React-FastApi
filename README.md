# Task List React FastApi

---

# Alldone Task List Application

This repository contains the backend (FastAPI) and frontend (React/Vite) for the Alldone Task List application.

## Table of Contents

1.  [1. Project Overview](#project-overview)
2.  [Prerequisites](#prerequisites)
3.  [Supabase Project Setup](#supabase-project-setup)
    *   [Get API Keys](#get-api-keys)
    *   [Database Schema & Row Level Security (RLS)](#database-schema--row-level-security-rls)
4.  [Backend Setup (FastAPI)](#backend-setup-fastapi)
5.  [Frontend Setup (React/Vite)](#frontend-setup-reactvite)
6.  [Running the Application](#running-the-application)
7.  [Testing](#testing)
    *   [Backend Testing](#backend-testing)
    *   [Frontend Testing](#frontend-testing)


---

## Project Overview

The Alldone Task List is a full-stack application that allows users to register, log in, and manage their personal task lists.
-   **Backend**: Developed with FastAPI, handling API requests, authentication (via Supabase Auth), and task management (persisted in Supabase PostgreSQL).
-   **Frontend**: Built with React and Vite, providing a user-friendly interface to interact with the backend API.
-   **Database/Auth**: Powered by Supabase, providing a PostgreSQL database and authentication services.

## Prerequisites

Before you begin, ensure you have the following installed on your system:

*   **Git**: For cloning the repository.
*   **Python 3.10+**: For the FastAPI backend.
*   **Node.js LTS**: For the React frontend (includes `npm` or `yarn`).

## Supabase Project Setup

Your application relies on a Supabase project for its database and authentication.

1.  **Create a Supabase Project**:
    *   Go to [Supabase](https://supabase.com/) and sign up or log in.
    *   Create a new project. Remember your `Project Reference ID`.

### Get API Keys

Once your project is created:

*   Navigate to `Project Settings > DATA API`.
*   You will find your **Project URL** (e.g., `https://<your-project-ref>.supabase.co`).
*   Scroll down to "API keys" to find your:
    *   **`anon` (public) key**: This key is safe to use in the browser.
    *   **`service_role` (secret) key**: This key has full bypass privileges and should *never* be exposed in client-side code.

### Database Schema & Row Level Security (RLS)

You need to set up the `tasks` table and its Row Level Security policies in your Supabase project's SQL Editor.

1.  Navigate to **SQL Editor** in your Supabase project.
2.  Run the following SQL block. This code creates the `tasks` table, enables Row Level Security, and defines policies to ensure users can only interact with their own tasks, even if the policies are applied to the `public` role.

    ```sql
    -- Enable the UUID extension if not already enabled.
    CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

    -- 1. Create the 'tasks' table
    CREATE TABLE public.tasks (
        id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
        text text NOT NULL,
        completed boolean DEFAULT FALSE NOT NULL,
        created_at timestamptz DEFAULT NOW() NOT NULL,
        updated_at timestamptz DEFAULT NOW() NOT NULL
    );

    -- 2. Enable Row Level Security (RLS) on the 'tasks' table
    ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

    -- 3. Create RLS Policies for the 'public' role (all users, authenticated or not)
    --    The 'USING' and 'WITH CHECK' clauses will then enforce ownership based on 'auth.uid()'.
    --    'auth.uid()' returns the UUID of the currently authenticated user; if no user is authenticated, it returns NULL.

    -- Policy for SELECT (Read) operations
    -- Allows 'public' role (all users) to view tasks. The 'USING' clause, however,
    -- ensures that only tasks where the 'user_id' matches the currently authenticated
    -- user's ID (`auth.uid()`) will be returned. If no user is authenticated, no tasks are returned.
    CREATE POLICY "Users can view their own tasks" ON public.tasks
    FOR SELECT TO public
    USING (auth.uid() = user_id);

    -- Policy for INSERT (Create) operations
    -- Allows 'public' role (all users) to create tasks. The 'WITH CHECK' clause
    -- strictly enforces that the 'user_id' provided in the new task MUST match
    -- the currently authenticated user's ID (`auth.uid()`). If no user is authenticated, creation fails.
    CREATE POLICY "Users can create their own tasks" ON public.tasks
    FOR INSERT TO public
    WITH CHECK (auth.uid() = user_id);

    -- Policy for UPDATE operations
    -- Allows 'public' role (all users) to update tasks.
    -- The 'USING' clause verifies ownership of the existing task row before allowing the update.
    -- The 'WITH CHECK' clause prevents an authenticated user from changing the 'user_id' of a task
    -- to someone else's ID.
    CREATE POLICY "Users can update their own tasks" ON public.tasks
    FOR UPDATE TO public
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

    -- Policy for DELETE operations
    -- Allows 'public' role (all users) to delete tasks. The 'USING' clause ensures that
    -- only tasks where the 'user_id' matches the currently authenticated user's ID (`auth.uid()`)
    -- can be deleted.
    CREATE POLICY "Users can delete their own tasks" ON public.tasks
    FOR DELETE TO public
    USING (auth.uid() = user_id);
    ```

## Backend Setup (FastAPI)

1.  **Navigate to the `backend` directory**:
    ```bash
    cd C:\Franco\Proyects\JackRipper01\Task-List-React-FastApi\backend
    ```

2.  **Create and activate a Python virtual environment**:
    ```bash
    python -m venv .venv
    ```
    *   **On Windows**:
        ```bash
        .venv\Scripts\activate
        ```
    *   **On macOS/Linux**:
        ```bash
        source .venv/bin/activate
        ```

3.  **Install backend dependencies**:
    ```bash
    pip install -r src/requirements.txt
    ```

4.  **Create a `.env` file**:
    In the `backend` directory (i.e., `C:\Franco\Proyects\JackRipper01\Task-List-React-FastApi\backend\.env`), create a new file named `.env` and add the following content, replacing the placeholder values with your actual Supabase API keys:

    ```env
    # Supabase Backend Configuration
    SUPABASE_URL="<YOUR_SUPABASE_PROJECT_URL>"
    SUPABASE_SECRET_KEY="<YOUR_SUPABASE_SECRET_KEY>"

    # API and Web App URLs
    VITE_API_BASE_URL="http://127.0.0.1:8000"
    VITE_WEB_APP_BASE_URL="http://localhost:5173"
    ```

## Frontend Setup (React/Vite)

*(Assuming your frontend project is in a `frontend` directory sibling to `backend`)*

1.  **Navigate to the `frontend` directory**:
    ```bash
    cd C:\Franco\Proyects\JackRipper01\Task-List-React-FastApi\frontend
    ```

2.  **Install frontend dependencies**:
    ```bash
    npm install
    # or if you use yarn
    # yarn install
    ```

3.  **Create a `.env` file**:
    In the `frontend` directory (e.g., `C:\Franco\Proyects\JackRipper01\Task-List-React-FastApi\frontend\.env`), create a new file named `.env` and add the following content:

    ```env
    # Supabase Frontend Configuration
    VITE_SUPABASE_URL="<YOUR_SUPABASE_PROJECT_URL>"
    VITE_SUPABASE_ANON_KEY="<YOUR_SUPABASE_ANON_KEY>"

    # API and Web App URLs
    VITE_API_BASE_URL="http://127.0.0.1:8000"
    VITE_WEB_APP_BASE_URL="http://localhost:5173"
    ```
    *   Replace `<YOUR_SUPABASE_PROJECT_URL>` and `<YOUR_SUPABASE_ANON_KEY>` with your actual Supabase project URL and anon public key.
    *   `VITE_API_BASE_URL` should match the address and port where your FastAPI backend will run.
    *   `VITE_WEB_APP_BASE_URL` should match the address and port where your React development server will run.

## Running the Application

You need to run both the backend and frontend simultaneously.

### Start the Backend

1.  Ensure your terminal is in the `backend` directory and your virtual environment is activated.
2.  Run the FastAPI application:
    ```bash
    uvicorn src.main:app --reload
    ```
    The backend API will be available at `http://127.0.0.1:8000`.

### Start the Frontend

1.  Open a **new terminal window/tab**.
2.  Navigate to the `frontend` directory.
    ```bash
    cd C:\Franco\Proyects\JackRipper01\Task-List-React-FastApi\frontend
    ```
3.  Start the React development server:
    ```bash
    npm run dev
    # or if you use yarn
    # yarn dev
    ```
    The frontend application will typically be available at `http://localhost:5173`.

### Access the Application

Once both servers are running, open your web browser and navigate to `http://localhost:5173`. You should see the Alldone Task List application.

---

## Testing

### Backend Testing

To run the backend tests:

1.  Ensure your terminal is in the `backend` directory and your virtual environment is activated.
2.  Run pytest:
    ```bash
    pytest
    ```

### Frontend Testing

To run the frontend tests:

1.  Ensure your terminal is in the `frontend` directory.
2.  Run the test command (usually configured in `package.json`):
    ```bash
    npm run test:frontend
    ```

---
