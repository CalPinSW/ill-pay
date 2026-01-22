# Implementation Plan - I'll Pay

This document outlines the phased development approach for the receipt splitting app.

---

## Tech Stack Summary

- **Mobile**: React Native with Expo (managed workflow)
- **Backend**: Supabase Edge Functions (Deno/TypeScript)
- **Database**: Supabase PostgreSQL
- **Auth**: Supabase Auth (email/password + social)
- **Real-time**: Supabase Realtime (WebSocket subscriptions)
- **AI**: Google Gemini API (vision for receipt parsing)

---

## Phase 1: Project Foundation

**Goal**: Set up the development environment and core infrastructure.

### 1.1 Expo Project Setup
- [ ] Initialize Expo project with TypeScript template
- [ ] Configure ESLint and Prettier
- [ ] Set up path aliases (`@/components`, `@/screens`, etc.)
- [ ] Install core dependencies:
  - `@supabase/supabase-js` - Supabase client
  - `expo-camera` - Receipt photo capture
  - `expo-image-picker` - Gallery selection
  - `react-navigation` - Navigation
  - `zustand` - State management
  - `react-native-qrcode-svg` - QR code generation
  - `react-native-qrcode-scanner` - QR code scanning

### 1.2 Supabase Project Setup
- [ ] Create Supabase project
- [ ] Initialize Supabase CLI locally (`supabase init`)
- [ ] Configure local development environment
- [ ] Set up environment variables

### 1.3 Database Schema Design
- [ ] Create initial migration with core tables:

```sql
-- Users (extends Supabase auth.users)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  display_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Friendships (bidirectional)
CREATE TABLE friendships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  friend_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  status TEXT CHECK (status IN ('pending', 'accepted', 'blocked')) DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, friend_id)
);

-- Receipts
CREATE TABLE receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  restaurant_name TEXT,
  receipt_date DATE,
  subtotal DECIMAL(10,2),
  tax DECIMAL(10,2),
  tip_amount DECIMAL(10,2),
  tip_type TEXT CHECK (tip_type IN ('proportional', 'equal')) DEFAULT 'proportional',
  total DECIMAL(10,2),
  image_url TEXT,
  share_code TEXT UNIQUE,
  status TEXT CHECK (status IN ('draft', 'active', 'settled')) DEFAULT 'draft',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Receipt Line Items
CREATE TABLE receipt_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  receipt_id UUID REFERENCES receipts(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  quantity INTEGER DEFAULT 1,
  unit_price DECIMAL(10,2) NOT NULL,
  total_price DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Receipt Participants
CREATE TABLE receipt_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  receipt_id UUID REFERENCES receipts(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  invited_via TEXT CHECK (invited_via IN ('friend', 'link', 'qr')),
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(receipt_id, user_id)
);

-- Item Claims (which user claimed which item)
CREATE TABLE item_claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID REFERENCES receipt_items(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  quantity INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(item_id, user_id)
);
```

- [ ] Set up Row Level Security (RLS) policies
- [ ] Create database functions for calculations

### 1.4 Authentication Flow
- [ ] Implement sign up screen
- [ ] Implement sign in screen
- [ ] Implement password reset flow
- [ ] Create auth context/provider
- [ ] Handle session persistence

---

## Phase 2: Core User Features

**Goal**: Users can create accounts, manage profiles, and add friends.

### 2.1 Profile Management
- [ ] Profile creation on first sign-in
- [ ] Profile edit screen (display name, avatar)
- [ ] Username search functionality

### 2.2 Friends System
- [ ] Friends list screen
- [ ] Send friend request
- [ ] Accept/decline friend requests
- [ ] Remove friend
- [ ] Friend request notifications

### 2.3 Navigation Structure
- [ ] Bottom tab navigator:
  - Home (recent receipts)
  - Scan (new receipt)
  - Friends
  - Profile
- [ ] Stack navigators for each tab

---

## Phase 3: Receipt Scanning & Parsing

**Goal**: Users can photograph receipts and have them parsed by AI.

### 3.1 Camera Integration
- [ ] Camera screen with capture UI
- [ ] Image preview and retake option
- [ ] Gallery picker alternative
- [ ] Image upload to Supabase Storage

### 3.2 Gemini Edge Function
- [ ] Create `parse-receipt` Edge Function
- [ ] Implement Gemini API integration
- [ ] Design prompt for structured receipt extraction:

```typescript
// Expected response structure
interface ParsedReceipt {
  restaurant_name?: string;
  date?: string;
  items: {
    name: string;
    quantity: number;
    unit_price: number;
    total_price: number;
  }[];
  subtotal?: number;
  tax?: number;
  tip?: number;
  total?: number;
}
```

- [ ] Handle parsing errors gracefully
- [ ] Return structured JSON response

### 3.3 Receipt Review Screen
- [ ] Display parsed items in editable list
- [ ] Allow manual corrections
- [ ] Add/remove items manually
- [ ] Confirm and save receipt

---

## Phase 4: Receipt Sharing & Real-time

**Goal**: Users can share receipts and see live updates.

### 4.1 Share Mechanisms
- [ ] Generate unique share code per receipt
- [ ] Share via friend selection (in-app)
- [ ] Generate shareable deep link
- [ ] Generate QR code for in-person sharing
- [ ] QR code scanner to join receipt

### 4.2 Real-time Subscriptions
- [ ] Subscribe to receipt changes
- [ ] Subscribe to participant joins
- [ ] Subscribe to item claim changes
- [ ] Handle optimistic updates
- [ ] Implement conflict resolution

### 4.3 Receipt Participant View
- [ ] Join receipt via link/QR
- [ ] View receipt items
- [ ] Claim items (with quantity selector)
- [ ] See other participants' claims
- [ ] Real-time claim indicators

---

## Phase 5: Bill Calculation & Settlement

**Goal**: Calculate and display what each person owes.

### 5.1 Calculation Logic
- [ ] Calculate per-person item totals
- [ ] Implement proportional tip distribution:
  ```
  user_tip = (user_items_total / receipt_subtotal) * tip_amount
  ```
- [ ] Implement equal tip distribution (alternative)
- [ ] Calculate tax distribution (proportional)
- [ ] Handle unclaimed items (split equally or assign to owner)

### 5.2 Settlement Screen
- [ ] Summary view per participant
- [ ] Breakdown: items + tax portion + tip portion
- [ ] Total owed per person
- [ ] Mark receipt as settled
- [ ] Settlement history

### 5.3 Database Functions
- [ ] Create PostgreSQL function for totals calculation
- [ ] Trigger recalculation on claim changes

---

## Phase 6: Polish & Quality

**Goal**: Improve UX, handle edge cases, prepare for release.

### 6.1 Error Handling
- [ ] Network error states
- [ ] Empty states
- [ ] Loading skeletons
- [ ] Retry mechanisms

### 6.2 Notifications (Optional for MVP)
- [ ] Push notification setup (Expo)
- [ ] Friend request notifications
- [ ] Receipt invitation notifications
- [ ] Settlement reminders

### 6.3 Testing
- [ ] Unit tests for calculation logic
- [ ] Integration tests for Edge Functions
- [ ] E2E tests for critical flows

### 6.4 App Store Preparation
- [ ] App icons and splash screen
- [ ] App store screenshots
- [ ] Privacy policy
- [ ] Build and submit

---

## Database Diagram

```
┌─────────────┐       ┌─────────────────┐
│   profiles  │       │   friendships   │
├─────────────┤       ├─────────────────┤
│ id (PK)     │◄──────│ user_id (FK)    │
│ username    │◄──────│ friend_id (FK)  │
│ display_name│       │ status          │
│ avatar_url  │       └─────────────────┘
└─────────────┘
       │
       │ 1:N
       ▼
┌─────────────┐       ┌─────────────────────┐
│  receipts   │       │ receipt_participants│
├─────────────┤       ├─────────────────────┤
│ id (PK)     │◄──────│ receipt_id (FK)     │
│ owner_id(FK)│       │ user_id (FK)        │
│ share_code  │       │ invited_via         │
│ tip_type    │       └─────────────────────┘
│ ...         │
└─────────────┘
       │
       │ 1:N
       ▼
┌───────────────┐     ┌─────────────────┐
│ receipt_items │     │  item_claims    │
├───────────────┤     ├─────────────────┤
│ id (PK)       │◄────│ item_id (FK)    │
│ receipt_id(FK)│     │ user_id (FK)    │
│ name          │     │ quantity        │
│ quantity      │     └─────────────────┘
│ unit_price    │
│ total_price   │
└───────────────┘
```

---

## API Endpoints (Edge Functions)

| Function | Method | Description |
|----------|--------|-------------|
| `parse-receipt` | POST | Upload image, returns parsed items |
| `generate-share-link` | POST | Creates shareable link for receipt |
| `join-receipt` | POST | Join receipt via share code |
| `calculate-totals` | GET | Get calculated totals per participant |

---

## Environment Variables

### Mobile App (`app/.env`)
```
EXPO_PUBLIC_SUPABASE_URL=
EXPO_PUBLIC_SUPABASE_ANON_KEY=
```

### Supabase Edge Functions (`supabase/.env`)
```
GEMINI_API_KEY=
```

---

## Milestones

| Milestone | Phases | Estimated Effort |
|-----------|--------|------------------|
| **M1: Foundation** | Phase 1 | 1-2 weeks |
| **M2: User System** | Phase 2 | 1 week |
| **M3: Receipt Scanning** | Phase 3 | 1-2 weeks |
| **M4: Sharing & Real-time** | Phase 4 | 1-2 weeks |
| **M5: Calculations** | Phase 5 | 1 week |
| **M6: Release Ready** | Phase 6 | 1-2 weeks |

**Total Estimated: 6-10 weeks**

---

## Next Steps

1. Create Supabase project at [supabase.com](https://supabase.com)
2. Get Gemini API key from [Google AI Studio](https://aistudio.google.com)
3. Begin Phase 1.1 - Expo project initialization
