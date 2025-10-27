# config.py

import os
import dotenv

# Load environment variables from .env file
dotenv.load_dotenv()

# Add Supabase API Keys
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")


# --- Frontend CORS Origins ---
# This list will be used for Cross-Origin Resource Sharing (CORS) configuration
# It specifies which origins are allowed to make requests to this API.
FRONTEND_CORS_ORIGINS = [
    "http://localhost:8080",
    "http://127.0.0.1:8080",
    "https://alldone-task-list.onrender.com",
    "http://127.0.0.1:5173",
    "http://localhost:5173",
    "https://alldone-task-list.vercel.app",
]

