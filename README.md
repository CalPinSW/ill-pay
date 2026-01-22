# I'll Pay - Receipt Splitting App

A mobile app for splitting restaurant bills with friends. Scan a receipt, let everyone select what they had, and calculate who owes what.

## Features

- 📸 **Receipt Scanning** - Take a photo of your receipt and AI extracts all line items
- 👥 **Friends System** - Add friends and split bills together
- 🔗 **Easy Sharing** - Invite via friend list, share link, or QR code
- 💰 **Smart Splitting** - Proportional tip distribution with configurable options
- ⚡ **Real-time Updates** - See selections update live as friends claim items

## Tech Stack

| Layer | Technology |
|-------|------------|
| **Mobile App** | React Native (Expo) |
| **Backend** | Supabase Edge Functions |
| **Database** | Supabase PostgreSQL |
| **Auth** | Supabase Auth |
| **Real-time** | Supabase Realtime (WebSockets) |
| **AI/OCR** | Google Gemini API |

## Project Structure

```
ill-pay/
├── app/                    # React Native app (Expo)
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── screens/        # App screens
│   │   ├── hooks/          # Custom React hooks
│   │   ├── services/       # API and external service calls
│   │   ├── store/          # State management
│   │   ├── types/          # TypeScript types
│   │   └── utils/          # Helper functions
│   └── app.json
├── supabase/
│   ├── functions/          # Edge Functions
│   ├── migrations/         # Database migrations
│   └── config.toml
└── docs/                   # Additional documentation
```

## Getting Started

### Prerequisites

- Node.js 18+
- Expo CLI (`npm install -g expo-cli`)
- Supabase CLI (`npm install -g supabase`)
- iOS Simulator (Mac) or Android Emulator

### Installation

```bash
# Clone the repository
git clone https://github.com/YOUR_USERNAME/ill-pay.git
cd ill-pay

# Install app dependencies
cd app
npm install

# Start the development server
npx expo start
```

### Environment Setup

Create `.env` files with your credentials:

```bash
# app/.env
EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# supabase/.env
GEMINI_API_KEY=your_gemini_api_key
```

## Documentation

- [Implementation Plan](./IMPLEMENTATION_PLAN.md) - Detailed development roadmap
- [Database Schema](./docs/DATABASE_SCHEMA.md) - Database design (coming soon)
- [API Documentation](./docs/API.md) - Edge function endpoints (coming soon)

## License

MIT
