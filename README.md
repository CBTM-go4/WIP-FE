# WIP Frontend

Next.js front end for the WIP (brain) API. Uses Tailwind for styling.

## Setup

1. Copy `.env.example` to `.env.local` and set `NEXT_PUBLIC_API_URL` if your API is not at `http://localhost:3000`.
2. Install and run:

```bash
npm install
npm run dev
```

The app runs on **http://localhost:3001** so it does not clash with the API on port 3000.

## Pages

- **/** – Home with links to register, login, users
- **/register** – Create account
- **/login** – Log in (stores JWT in `localStorage`)
- **/profile** – View and edit your profile (requires login)
- **/users** – List all users (requires login)

Ensure the API is running and CORS allows `http://localhost:3001` if you add it to the API config.
