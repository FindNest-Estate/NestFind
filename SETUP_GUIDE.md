# NestFind Project Setup Guide

This guide will help you set up the **NestFind** project on a new system. The project consists of three main parts:
1.  **Backend** (FastAPI, Python)
2.  **Frontend** (Next.js, React)
3.  **Mobile App** (Expo, React Native)

## Prerequisites

Before starting, ensure the target system has the following installed:
-   **Git**
-   **Python 3.9+**
-   **Node.js 18+** (LTS recommended)
-   **Ollama** (Required for AI features)

---

## 1. Cloning the Repository

```bash
git clone https://github.com/FindNest-Estate/NestFind.git
cd NestFind
```

---

## 2. Backend Setup (Python/FastAPI)

The backend handles the API, database, and AI integration.

1.  **Navigate to the backend directory:**
    ```bash
    cd backend
    ```

2.  **Create a virtual environment (recommended):**
    ```bash
    python -m venv venv
    ```
    -   *Windows:* `.\venv\Scripts\activate`
    -   *Mac/Linux:* `source venv/bin/activate`

3.  **Install dependencies:**
    We have realized a `requirements.txt` file for you.
    ```bash
    pip install -r requirements.txt
    ```

    **Key Dependencies Installed:**
    -   **Core**: FastAPI, Uvicorn (Server)
    -   **Database**: SQLAlchemy, SQLite driver
    -   **Security**: Python-Jose (JWT), Passlib (Hashing)
    -   **Utils**: Pydantic (Validation), Requests, APScheduler

4.  **Environment Configuration:**
    Create a `.env` file in the `backend` directory. You can duplicate `.env.example` if it exists, or add the following keys:
    ```env
    # Database (Default uses SQLite, so this might be optional or pre-configured in code)
    DATABASE_URL=sqlite:///./nestfind.db
    
    # Security (Generate a secure random string)
    SECRET_KEY=your_secret_key_here
    ALGORITHM=HS256
    ACCESS_TOKEN_EXPIRE_MINUTES=30
    ```

5.  **AI Setup (Ollama):**
    The backend uses **Ollama** for AI features (Description Generation, Price Estimation).
    -   Install Ollama from [ollama.com](https://ollama.com).
    -   Pull the required models:
        ```bash
        ollama pull llama3.1:8b
        ollama pull mistral:7b
        ```
    -   Ensure Ollama is running (`ollama serve`).

6.  **Run the Backend:**
    ```bash
    uvicorn main:app --reload
    ```
    The API will run at `http://localhost:8000`.

7.  **Create Admin User (Optional):**
    To access admin features, create a default admin account:
    ```bash
    # Run from the backend/ directory
    python -m scripts.create_admin
    ```
    This will create a user with:
    -   Email: `nestfind@gmail.com`
    -   Password: `123456789`

---

## 3. Frontend Setup (Next.js)

1.  **Navigate to the frontend directory:**
    ```bash
    cd ../frontend
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    # or
    yarn install
    ```

3.  **Run the Frontend:**
    ```bash
    npm run dev
    ```
    The web app will run at `http://localhost:3000`.

    **Key Dependencies Installed:**
    Running `npm install` handles everything, including:
    -   **Framework**: Next.js 16, React 19
    -   **Styling**: Tailwind CSS v4, clsx, tailwind-merge
    -   **UI Components**: Lucide React (Icons), Sonner (Toasts), Framer Motion (Animations)
    -   **Maps**: Leaflet, React Leaflet
    -   **Data/Forms**: Recharts (Charts), React Hook Form, Zod

---

## 4. Mobile App Setup (Expo)

1.  **Navigate to the mobile directory:**
    ```bash
    cd ../mobile
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Run the Mobile App:**
    ```bash
    npx expo start
    ```
    -   Scan the QR code with your phone (using Expo Go).
    -   Or press `a` to run on Android Emulator / `i` for iOS Simulator.

    **Key Dependencies Installed:**
    Running `npm install` will automatically set up:
    -   **Core**: React Native 0.81, Expo SDK 54
    -   **Navigation**: Expo Router (`expo-router`)
    -   **Styling**: NativeWind (`nativewind`) & TailwindCSS
    -   **Maps**: `react-native-maps`, `expo-location`
    -   **Utils**: `axios` (API), `date-fns` (transforming dates)

    > **Tip:** If you encounter version mismatch warnings, run `npx expo install --fix` to align dependencies with the Expo SDK version.

---

## Troubleshooting

-   **Database**: The project uses SQLite (`nestfind.db`). If you want a fresh start, you can delete this file, and the backend will recreate it on the next startup (if `models.Base.metadata.create_all` is enabled).
-   **AI Errors**: If you see errors related to `/ai`, ensure Ollama is running and the models (`llama3.1:8b`, `mistral:7b`) are downloaded.
