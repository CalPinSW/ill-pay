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
# Get publishable key from: Dashboard → Settings → API Keys → New API Keys
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_xxx

# supabase/.env
GEMINI_API_KEY=your_gemini_api_key
```

> **Note:** We use the new `sb_publishable_` key format instead of the legacy `anon` key. See [Supabase API Keys documentation](https://supabase.com/docs/guides/api/api-keys) for details.

## Project Management

### Jira Board

- **Board URL**: [calpinsw.atlassian.net/jira/software/projects/IP/boards/35](https://calpinsw.atlassian.net/jira/software/projects/IP/boards/35)
- **Project Key**: `IP`

### Jira CLI Setup

Install the Jira CLI:
```bash
brew install ankitpokhrel/jira-cli/jira-cli
```

Generate an API token at [id.atlassian.com/manage-profile/security/api-tokens](https://id.atlassian.com/manage-profile/security/api-tokens), then configure authentication:

```bash
# Add credentials to ~/.netrc
cat >> ~/.netrc << EOF
machine calpinsw.atlassian.net
login your-email@example.com
password YOUR_API_TOKEN
EOF

chmod 600 ~/.netrc
```

### Common Jira CLI Commands

```bash
# List all issues
jira issue list

# List issues by status
jira issue list -s"To Do"
jira issue list -s"In Progress"

# View issue in browser
jira open IP-8

# Move issue to In Progress
jira issue move IP-8 "In Progress"

# Move issue to Done
jira issue move IP-8 "Done"

# View epic and its children
jira epic list
jira issue list -P IP-2    # List tasks under Phase 1 epic

# Filter by label
jira issue list -l"auth"
jira issue list -l"database"
```

### Creating New Tickets

Use the script to bulk-create tickets from the implementation plan:
```bash
./scripts/create-jira-tickets.sh
```

Or create individual issues:
```bash
jira issue create -tTask -s"Task summary" -P"IP-2" -l"label"
```

## Documentation

- [Implementation Plan](./IMPLEMENTATION_PLAN.md) - Detailed development roadmap
- [Database Schema](./docs/DATABASE_SCHEMA.md) - Database design (coming soon)
- [API Documentation](./docs/API.md) - Edge function endpoints (coming soon)

## License

MIT
