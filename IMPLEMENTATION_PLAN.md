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

## Phase 1: Project Foundation ([IP-2](https://calpinsw.atlassian.net/browse/IP-2))

**Goal**: Set up the development environment and core infrastructure.

### 1.1 Expo Project Setup
- [x] Initialize Expo project with TypeScript template ([IP-8](https://calpinsw.atlassian.net/browse/IP-8))
- [x] Configure ESLint and Prettier ([IP-9](https://calpinsw.atlassian.net/browse/IP-9))
- [x] Set up path aliases (`@/components`, `@/screens`, etc.) ([IP-10](https://calpinsw.atlassian.net/browse/IP-10))
- [x] Install core dependencies ([IP-11](https://calpinsw.atlassian.net/browse/IP-11)):
  - `@supabase/supabase-js` - Supabase client
  - `expo-camera` - Receipt photo capture
  - `expo-image-picker` - Gallery selection
  - `@react-navigation/native`, `@react-navigation/native-stack`, `@react-navigation/bottom-tabs` - Navigation
  - `zustand` - State management
  - `react-native-qrcode-svg` - QR code generation
  - `expo-barcode-scanner` - QR code scanning
  - `expo-secure-store` - Secure token storage

### 1.2 Supabase Project Setup
- [x] Create Supabase project ([IP-12](https://calpinsw.atlassian.net/browse/IP-12))
- [x] Initialize Supabase CLI locally (`supabase init`) ([IP-13](https://calpinsw.atlassian.net/browse/IP-13))
- [x] Configure local development environment ([IP-14](https://calpinsw.atlassian.net/browse/IP-14))
- [x] Set up environment variables ([IP-15](https://calpinsw.atlassian.net/browse/IP-15))

### 1.3 Database Schema Design
- [ ] Create initial migration with core tables ([IP-16](https://calpinsw.atlassian.net/browse/IP-16)):

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

- [ ] Set up Row Level Security (RLS) policies ([IP-17](https://calpinsw.atlassian.net/browse/IP-17))
- [ ] Create database functions for calculations ([IP-18](https://calpinsw.atlassian.net/browse/IP-18))

### 1.4 Authentication Flow
- [ ] Implement sign up screen ([IP-19](https://calpinsw.atlassian.net/browse/IP-19))
- [ ] Implement sign in screen ([IP-20](https://calpinsw.atlassian.net/browse/IP-20))
- [ ] Implement password reset flow ([IP-21](https://calpinsw.atlassian.net/browse/IP-21))
- [ ] Create auth context/provider ([IP-22](https://calpinsw.atlassian.net/browse/IP-22))
- [ ] Handle session persistence ([IP-23](https://calpinsw.atlassian.net/browse/IP-23))

---

## Phase 2: Core User Features ([IP-3](https://calpinsw.atlassian.net/browse/IP-3))

**Goal**: Users can create accounts, manage profiles, and add friends.

### 2.1 Profile Management
- [ ] Profile creation on first sign-in ([IP-24](https://calpinsw.atlassian.net/browse/IP-24))
- [ ] Profile edit screen (display name, avatar) ([IP-25](https://calpinsw.atlassian.net/browse/IP-25))
- [ ] Username search functionality ([IP-26](https://calpinsw.atlassian.net/browse/IP-26))

### 2.2 Friends System
- [ ] Friends list screen ([IP-27](https://calpinsw.atlassian.net/browse/IP-27))
- [ ] Send friend request ([IP-28](https://calpinsw.atlassian.net/browse/IP-28))
- [ ] Accept/decline friend requests ([IP-29](https://calpinsw.atlassian.net/browse/IP-29))
- [ ] Remove friend ([IP-30](https://calpinsw.atlassian.net/browse/IP-30))
- [ ] Friend request notifications ([IP-31](https://calpinsw.atlassian.net/browse/IP-31))

### 2.3 Navigation Structure
- [ ] Bottom tab navigator ([IP-32](https://calpinsw.atlassian.net/browse/IP-32)):
  - Home (recent receipts)
  - Scan (new receipt)
  - Friends
  - Profile
- [ ] Stack navigators for each tab ([IP-33](https://calpinsw.atlassian.net/browse/IP-33))

---

## Phase 3: Receipt Scanning & Parsing ([IP-4](https://calpinsw.atlassian.net/browse/IP-4))

**Goal**: Users can photograph receipts and have them parsed by AI.

### 3.1 Camera Integration
- [ ] Camera screen with capture UI ([IP-34](https://calpinsw.atlassian.net/browse/IP-34))
- [ ] Image preview and retake option ([IP-35](https://calpinsw.atlassian.net/browse/IP-35))
- [ ] Gallery picker alternative ([IP-36](https://calpinsw.atlassian.net/browse/IP-36))
- [ ] Image upload to Supabase Storage ([IP-37](https://calpinsw.atlassian.net/browse/IP-37))

### 3.2 Gemini Edge Function
- [ ] Create `parse-receipt` Edge Function ([IP-38](https://calpinsw.atlassian.net/browse/IP-38))
- [ ] Implement Gemini API integration ([IP-39](https://calpinsw.atlassian.net/browse/IP-39))
- [ ] Design prompt for structured receipt extraction ([IP-40](https://calpinsw.atlassian.net/browse/IP-40)):

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

- [ ] Handle parsing errors gracefully ([IP-41](https://calpinsw.atlassian.net/browse/IP-41))
- [ ] Return structured JSON response ([IP-42](https://calpinsw.atlassian.net/browse/IP-42))

### 3.3 Receipt Review Screen
- [ ] Display parsed items in editable list ([IP-43](https://calpinsw.atlassian.net/browse/IP-43))
- [ ] Allow manual corrections ([IP-44](https://calpinsw.atlassian.net/browse/IP-44))
- [ ] Add/remove items manually ([IP-45](https://calpinsw.atlassian.net/browse/IP-45))
- [ ] Confirm and save receipt ([IP-46](https://calpinsw.atlassian.net/browse/IP-46))

---

## Phase 4: Receipt Sharing & Real-time ([IP-5](https://calpinsw.atlassian.net/browse/IP-5))

**Goal**: Users can share receipts and see live updates.

### 4.1 Share Mechanisms
- [ ] Generate unique share code per receipt ([IP-47](https://calpinsw.atlassian.net/browse/IP-47))
- [ ] Share via friend selection (in-app) ([IP-48](https://calpinsw.atlassian.net/browse/IP-48))
- [ ] Generate shareable deep link ([IP-49](https://calpinsw.atlassian.net/browse/IP-49))
- [ ] Generate QR code for in-person sharing ([IP-50](https://calpinsw.atlassian.net/browse/IP-50))
- [ ] QR code scanner to join receipt ([IP-51](https://calpinsw.atlassian.net/browse/IP-51))

### 4.2 Real-time Subscriptions
- [ ] Subscribe to receipt changes ([IP-52](https://calpinsw.atlassian.net/browse/IP-52))
- [ ] Subscribe to participant joins ([IP-53](https://calpinsw.atlassian.net/browse/IP-53))
- [ ] Subscribe to item claim changes ([IP-54](https://calpinsw.atlassian.net/browse/IP-54))
- [ ] Handle optimistic updates ([IP-55](https://calpinsw.atlassian.net/browse/IP-55))
- [ ] Implement conflict resolution ([IP-56](https://calpinsw.atlassian.net/browse/IP-56))

### 4.3 Receipt Participant View
- [ ] Join receipt via link/QR ([IP-57](https://calpinsw.atlassian.net/browse/IP-57))
- [ ] View receipt items ([IP-58](https://calpinsw.atlassian.net/browse/IP-58))
- [ ] Claim items (with quantity selector) ([IP-59](https://calpinsw.atlassian.net/browse/IP-59))
- [ ] See other participants' claims ([IP-60](https://calpinsw.atlassian.net/browse/IP-60))
- [ ] Real-time claim indicators ([IP-61](https://calpinsw.atlassian.net/browse/IP-61))

---

## Phase 5: Bill Calculation & Settlement ([IP-6](https://calpinsw.atlassian.net/browse/IP-6))

**Goal**: Calculate and display what each person owes.

### 5.1 Calculation Logic
- [ ] Calculate per-person item totals ([IP-62](https://calpinsw.atlassian.net/browse/IP-62))
- [ ] Implement proportional tip distribution ([IP-63](https://calpinsw.atlassian.net/browse/IP-63)):
  ```
  user_tip = (user_items_total / receipt_subtotal) * tip_amount
  ```
- [ ] Implement equal tip distribution (alternative) ([IP-64](https://calpinsw.atlassian.net/browse/IP-64))
- [ ] Calculate tax distribution (proportional) ([IP-65](https://calpinsw.atlassian.net/browse/IP-65))
- [ ] Handle unclaimed items (split equally or assign to owner) ([IP-66](https://calpinsw.atlassian.net/browse/IP-66))

### 5.2 Settlement Screen
- [ ] Summary view per participant ([IP-67](https://calpinsw.atlassian.net/browse/IP-67))
- [ ] Breakdown: items + tax portion + tip portion ([IP-68](https://calpinsw.atlassian.net/browse/IP-68))
- [ ] Total owed per person ([IP-69](https://calpinsw.atlassian.net/browse/IP-69))
- [ ] Mark receipt as settled ([IP-70](https://calpinsw.atlassian.net/browse/IP-70))
- [ ] Settlement history ([IP-71](https://calpinsw.atlassian.net/browse/IP-71))

### 5.3 Database Functions
- [ ] Create PostgreSQL function for totals calculation ([IP-72](https://calpinsw.atlassian.net/browse/IP-72))
- [ ] Trigger recalculation on claim changes ([IP-73](https://calpinsw.atlassian.net/browse/IP-73))

---

## Phase 6: Polish & Quality ([IP-7](https://calpinsw.atlassian.net/browse/IP-7))

**Goal**: Improve UX, handle edge cases, prepare for release.

### 6.1 Error Handling
- [ ] Network error states ([IP-74](https://calpinsw.atlassian.net/browse/IP-74))
- [ ] Empty states ([IP-75](https://calpinsw.atlassian.net/browse/IP-75))
- [ ] Loading skeletons ([IP-76](https://calpinsw.atlassian.net/browse/IP-76))
- [ ] Retry mechanisms ([IP-77](https://calpinsw.atlassian.net/browse/IP-77))

### 6.2 Notifications (Optional for MVP)
- [ ] Push notification setup (Expo) ([IP-78](https://calpinsw.atlassian.net/browse/IP-78))
- [ ] Friend request notifications ([IP-79](https://calpinsw.atlassian.net/browse/IP-79))
- [ ] Receipt invitation notifications ([IP-80](https://calpinsw.atlassian.net/browse/IP-80))
- [ ] Settlement reminders ([IP-81](https://calpinsw.atlassian.net/browse/IP-81))

### 6.3 Testing
- [ ] Unit tests for calculation logic ([IP-82](https://calpinsw.atlassian.net/browse/IP-82))
- [ ] Integration tests for Edge Functions ([IP-83](https://calpinsw.atlassian.net/browse/IP-83))
- [ ] E2E tests for critical flows ([IP-84](https://calpinsw.atlassian.net/browse/IP-84))

### 6.4 App Store Preparation
- [ ] App icons and splash screen ([IP-85](https://calpinsw.atlassian.net/browse/IP-85))
- [ ] App store screenshots ([IP-86](https://calpinsw.atlassian.net/browse/IP-86))
- [ ] Privacy policy ([IP-87](https://calpinsw.atlassian.net/browse/IP-87))
- [ ] Build and submit ([IP-88](https://calpinsw.atlassian.net/browse/IP-88))

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
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=  # New format: sb_publishable_xxx
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
