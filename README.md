# 🌾 MandiDarpan

**MandiDarpan** is a full-stack agricultural mandi price platform that helps users find government-reported commodity prices, compare mandis, view price trends, and find nearby mandis.

## 🚀 Features

- 🌾 Commodity-wise mandi prices
- 📍 State & district-wise filtering
- 🏪 Mandi/APMC-wise price comparison
- 💰 Min, Max & Modal prices
- 📈 Historical price trends
- 📊 Price change & trend analysis
- 📏 Distance calculation from user location
- 🗺️ Mandi coordinates & location support
- 🔎 Search and filter mandis
- ✅ Data normalization & price validation
- 🚫 No artificial/interpolated prices
- 📱 Responsive frontend
- 🔗 REST API architecture

## 🛠️ Tech Stack

### Frontend
- React.js
- JavaScript
- HTML5
- CSS3
- REST API

### Backend
- Node.js
- Express.js
- JavaScript
- REST APIs
- Data validation & normalization

### Data Source
- 🇮🇳 Government of India **Data.gov.in API**
- Mandi/APMC market data
- Latitude & Longitude based distance calculation

## 📂 Project Structure

```text
MandiMitra/
├── frontend/
│   ├── src/
│   └── package.json
│
└── mandimitra-backend/
    ├── src/
    │   ├── controllers/
    │   ├── routes/
    │   ├── services/
    │   ├── utils/
    │   └── config/
    ├── server.js
    └── package.json
🔄 How It Works
User
  ↓
Frontend
  ↓
Backend REST API
  ↓
Government Data.gov.in API
  ↓
Normalize & Validate Data
  ↓
Price / Trend / Mandi Results
  ↓
Frontend
📈 Price Trends
MandiMitra calculates trends only from genuine government-reported prices.
At least 2 different observation dates are required to calculate a historical trend. Multiple mandi records from the same date are not treated as historical observations.
🔐 Data Reliability
Uses government-reported mandi data
Does not manufacture missing prices
Invalid price records are rejected
Missing historical data is reported explicitly
Data is normalized before being shown to users
⚙️ Installation & Setup
1. Clone Repository
git clone < https://m-andidarpan-9oot.vercel.app/ >
cd MandiMitra
2. Backend Setup
cd mandimitra-backend
npm install
npm run dev
Backend runs on:
http://m-andidarpan.vercel.app/
Health check:
http://m-andidarpan.vercel.app/api/health
3. Frontend Setup
Open a new terminal:
cd mandimitra-frontend
npm install
npm run dev                                                                                       <https://m-andidarpan-9oot.vercel.app/>


🏛️ Data Source
Price data is sourced from the official Government of India Data.gov.in platform.
MandiMitra displays available government data and does not create or estimate unavailable mandi prices.
👨‍💻 Author
Rudransh
