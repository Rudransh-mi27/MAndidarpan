# MandiDarpan (मंडी दर्पण)

**MandiDarpan** is a farmer-friendly agricultural intelligence platform designed for Indian farmers and traders. It provides real-time mandi prices, historical price trends, nearby market comparisons, and an AI advisory assistant powered by Gemma 4.

---

## Project Structure

```text
mandimitra/
├── frontend/             # React + Vite + Tailwind CSS (Runs on http://localhost:3000)
├── mandimitra-backend/   # Node.js + Express REST API (Runs on http://localhost:5001)
├── .gitignore            # Root ignore rules (protects credentials & node_modules)
└── README.md             # Project documentation & quick start guide
```

---

## Quick Start Guide

### 1. Prerequisites
- **Node.js** (v18 or higher recommended; verified on v24)
- **npm** (bundled with Node.js)

---

### 2. Backend Setup (`mandimitra-backend`)

```bash
# 1. Navigate to backend directory
cd mandimitra-backend

# 2. Install dependencies
npm install

# 3. Create your local environment file
cp .env.example .env
# Open .env and add your verified API keys if you have them:
# PORT=5001
# DATA_GOV_API_KEY=...
# GEMMA_API_KEY=...
# GEMMA_API_BASE_URL=https://generativelanguage.googleapis.com/v1beta
# GEMMA_MODEL_ID=gemma-4-26b-a4b-it

# 4. Start the backend development server
npm run dev
# The API will be available at: http://localhost:5001
# Health check: http://localhost:5001/api/health
```

---

### 3. Frontend Setup (`frontend`)

```bash
# 1. Open a new terminal tab and navigate to frontend
cd frontend

# 2. Install dependencies
npm install

# 3. Ensure local .env exists
cp .env.example .env
# VITE_API_URL=http://localhost:5001

# 4. Start Vite development server
npm run dev
# The website will be available at: http://localhost:3000
```

---

## Key Features

1. **Live Mandi Prices**: Real daily prices from Agmarknet (data.gov.in) with filter by commodity, district, and state.
2. **Price Trends**: Pure mathematical trend calculations over 7, 14, or 30 days with gap handling for market holidays.
3. **Mandi Comparison**: Like-for-like APMC market comparison by variety and grade.
4. **Nearest Mandi & GPS**: Distance estimation with strict zero-hallucination policy (displays "Distance unavailable" when coordinates are missing).
5. **Gemma 4 AI Assistant**: Conversational assistant in simple Hindi and English without leaking internal `<thought>` tags or internal reasoning.
6. **Bilingual UI**: One-click instant switch between Hindi (हिंदी) and English.

---

## Testing

To run the automated backend regression and unit tests:

```bash
cd mandimitra-backend
npm test
```
