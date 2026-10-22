MandiMitra (मंडी दर्पण)
MandiMitra is a farmer-friendly agricultural intelligence platform for
Indian farmers and traders. It provides mandi prices, price-trend
analysis, nearby market comparisons, and an AI advisory assistant
powered by a Gemma-compatible inference provider.
Project Structure
mandimitra/
├── frontend/             # React + Vite + Tailwind CSS (port 3000)
├── mandimitra-backend/   # Node.js + Express REST API (port 5001)
├── .gitignore            # Root ignore rules
└── README.md             # Project documentation
Prerequisites
- Node.js 18 or later
- npm (included with Node.js)
Quick Start
Run the backend and frontend in separate terminal windows.
1. Backend setup
cd mandimitra-backend
npm install
cp .env.example .env
Edit mandimitra-backend/.env and configure the API credentials you
have. Example variables:
PORT=5001
DATA_GOV_API_KEY=your_data_gov_api_key
GEMMA_API_KEY=your_provider_api_key
GEMMA_API_BASE_URL=https://your-provider.example/v1
GEMMA_MODEL_ID=your_verified_gemma_model_id
Start the development server:
npm run dev
The API should be available at http://localhost:5001. Health check:
curl http://localhost:5001/api/health
If port 5000 is occupied on macOS, set PORT=5001 in the backend .env
file.
2. Frontend setup
Open a second terminal:
cd frontend
npm install
cp .env.example .env
Set the frontend API URL in frontend/.env:
VITE_API_URL=http://localhost:5001
Start the frontend:
npm run dev
The website should be available at http://localhost:3000 if the Vite
configuration uses that port.
Key Features
1. Live mandi prices: Retrieves daily commodity prices from
   Agmarknet through data.gov.in, with filters such as commodity,
   district, and state.
2. Price trends: Calculates price changes over 7, 14, or 30 days,
   accounting for gaps in market reporting.
3. Mandi comparison: Compares markets using relevant commodity and
   variety information.
4. Nearest mandi and distance: Estimates straight-line distance
   when coordinates are available.
5. AI advisory assistant: Supports natural-language questions in
   Hindi and English, grounded in retrieved mandi data.
6. Bilingual interface: Supports Hindi and English.
API Endpoints
The backend exposes these routes:
  Method                  Endpoint                Purpose
  GET                   /api/health           Check whether the API
                                                  is running

  GET                   /api/prices/today     Retrieve current mandi
                                                  prices

  GET                   /api/prices/trend     Analyze price trends

  GET                   /api/mandis/compare   Compare mandi prices
                                                  and available distances

  POST                  /api/query            Submit a
                                                  natural-language
                                                  question to the AI
                                              assistant
Example requests
Health check:
curl http://localhost:5001/api/health
Today's prices:
curl "http://localhost:5001/api/prices/today?commodity=Wheat&district=Lucknow"
Price trend:
curl "http://localhost:5001/api/prices/trend?commodity=Wheat&district=Lucknow&days=7"
Mandi comparison:
curl "http://localhost:5001/api/mandis/compare?commodity=Wheat&lat=26.8467&lng=80.9462"
AI query:
curl -X POST http://localhost:5001/api/query \
  -H "Content-Type: application/json" \
  -d '{"question":"Lucknow mein gehun ka bhav badha ya ghata?"}'
Exact parameters and response fields may depend on the backend
implementation.
Data Source
The backend is designed to retrieve mandi price data from data.gov.in /
Agmarknet.
- Resource: Current Daily Price of Various Commodities from Various
  Markets (Mandi)
- Resource ID: 9ef84268-d588-465a-a308-a864a43d0070
- Base endpoint:
  https://api.data.gov.in/resource/9ef84268-d588-465a-a308-a864a43d0070
A valid DATA_GOV_API_KEY may be required for live queries.
Environment Variables and Secrets
- Keep real credentials in local .env files.
- Do not commit .env files or API keys to Git.
- Use .env.example only for placeholder values.
- The backend may return a configuration error for AI or live-data
  features when credentials are missing; other routes may still work.
Testing
Run the backend tests from the backend directory:
cd mandimitra-backend
npm test
Known Limitations
- Haversine distance is straight-line distance, not driving distance;
  it does not account for roads, bridges, traffic, or road conditions.
- Market data can have gaps because of holidays or reporting
  schedules.
- A price trend needs enough historical observations. The system
  should indicate insufficient history rather than inventing or
  extrapolating values.
- Live AI responses require valid credentials and a supported provider
  endpoint/model ID.
Development Notes
- Run backend and frontend in separate terminals.
- Keep the API base URL in the frontend environment configuration
  aligned with the backend port.
- Do not commit generated build directories, dependencies, local
  secrets, or logs.