# MandiMitra Backend

Backend API for MandiMitra — connecting farmers and traders with real-time agricultural mandi prices and insights.

## Prerequisites

- [Node.js](https://nodejs.org/) (v18 or higher recommended)
- `npm` (comes bundled with Node.js)

## Project Structure

```text
mandimitra-backend/
├── server.js               # Application entry point & HTTP listener
├── app.js                  # Express setup, middleware & route mounting
├── .env                    # Environment variables (local, git-ignored)
├── .env.example            # Template for environment configuration
├── .gitignore              # Files and folders excluded from Git
├── package.json            # Project dependencies and npm scripts
├── README.md               # Setup and development instructions
└── src/
    ├── config/             # Configuration & environment variable loaders
    ├── routes/             # Express API routes
    ├── controllers/        # Request handlers & response formatters
    ├── services/           # External API & business logic layer
    ├── utils/              # Helper utilities
    └── middleware/         # Custom Express middlewares (errors, auth, etc.)
```

## Getting Started

### 1. Install Dependencies

```bash
cd mandimitra-backend
npm install
```

### 2. Configure Environment Variables

Create your local `.env` file from the example template:

```bash
cp .env.example .env
```

The default `.env` includes:
```env
PORT=5000
DATA_GOV_API_KEY=PASTE_YOUR_DATA_GOV_API_KEY_HERE
GEMMA_API_KEY=PASTE_YOUR_GEMMA_PROVIDER_API_KEY_HERE
GEMMA_API_BASE_URL=PASTE_VERIFIED_PROVIDER_ENDPOINT_HERE
GEMMA_MODEL_ID=PASTE_VERIFIED_GEMMA_4_MODEL_ID_HERE
```

> **Note:** The server and health check endpoint will run normally even without setting the external API keys.

### 3. Run the Server

**Development Mode (auto-reloads on file changes):**
```bash
npm run dev
```

**Production Mode:**
```bash
npm start
```

### 4. Verify Health Endpoint

Once the server is running, verify with `curl` or open in your browser:

```bash
curl http://localhost:5000/api/health
```

Expected response:
```json
{
  "status": "ok",
  "message": "MandiMitra backend is operational",
  "timestamp": "2026-10-21T05:50:00.000Z"
}
```
