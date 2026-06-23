# PANGEA Frontend

> 📄 For the full project vision and technical specification, see the [PANGEA White Paper](https://github.com/Pangean1/pangea-backend/blob/main/docs/WHITEPAPER.md)

> Non-profit peer-to-peer humanitarian donation platform on **Polygon PoS** (Amoy testnet).

PANGEA lets donors send USDC directly to verified humanitarian campaigns with zero platform fees. This repository is the React Native / Expo mobile app — the donor and recipient interface. Blockchain complexity is invisible to the user: no seed phrases, no gas management, no crypto knowledge required.

- Smart contracts: [pangea-contracts](https://github.com/Pangean1/pangea-contracts)
- Backend API: [pangea-backend](https://github.com/Pangean1/pangea-backend)
- Network: Polygon Amoy (testnet) → Polygon PoS mainnet

---

## Table of Contents

1. [Architecture](#architecture)
2. [Screens](#screens)
3. [Getting Started](#getting-started)
4. [Environment Variables](#environment-variables)
5. [Running the Dev Server](#running-the-dev-server)
6. [Key Dependencies](#key-dependencies)
7. [License](#license)

---

## Architecture

```
/home/pangea/frontend/pangea-mobile/
│
├── app/                          # Expo Router — file-based navigation
│   ├── _layout.tsx               # Root layout
│   ├── index.tsx                 # Entry screen — Donor / Recipient selector
│   │
│   ├── (tabs)/                   # Donor dashboard (tab group)
│   │   ├── _layout.tsx
│   │   ├── donor.tsx             # Donor home — active campaigns + donation history
│   │   ├── all-campaigns.tsx     # Full campaign list
│   │   ├── all-donations.tsx     # Full donation history
│   │   └── all-impact-updates.tsx
│   │
│   ├── campaign/[id]/            # Campaign detail (dynamic route)
│   │   ├── _layout.tsx
│   │   ├── index.tsx             # Campaign detail screen
│   │   └── donate.tsx            # Full donation flow: amount → review → confirm → success
│   │
│   ├── recipient.tsx             # Recipient dashboard — incoming donations + campaign list
│   ├── recipient-all-campaigns.tsx
│   ├── recipient-all-donations.tsx
│   └── recipient-create-campaign.tsx
│
├── lib/                          # Shared logic
│   ├── api.ts                    # Axios client — all calls to pangea-backend
│   ├── queryClient.ts            # React Query client + session donation cache
│   ├── sessionDonations.tsx      # SessionDonation type
│   ├── donorShared.tsx           # Shared donor UI components
│   ├── localCampaigns.ts         # Local campaign data helpers
│   ├── campaignMedia.ts          # Campaign image helpers
│   └── format.ts                 # Currency + date formatters
│
├── constants/
│   └── colors.ts                 # Design tokens — all colors in one place
│
├── assets/                       # Images and icons
├── app.json                      # Expo app config
├── babel.config.js
├── tsconfig.json
└── package.json
```

---

## Screens

### Entry
- **`/`** — Landing screen with two paths: *Enter as Donor* or *Enter as Recipient*

### Donor flow
- **`/(tabs)/donor`** — Home dashboard: active campaigns fetched from the API, session donation history
- **`/(tabs)/all-campaigns`** — Full paginated campaign list
- **`/(tabs)/all-donations`** — Full donation history
- **`/campaign/[id]`** — Campaign detail: description, raised amount, recipient info
- **`/campaign/[id]/donate`** — Donation flow: enter amount → review → confirm → success screen

### Recipient flow
- **`/recipient`** — Home dashboard: incoming donations, campaign summary, post-update modal
- **`/recipient-all-campaigns`** — All campaigns owned by the recipient
- **`/recipient-all-donations`** — Full incoming donation history
- **`/recipient-create-campaign`** — Create a new humanitarian campaign

---

## Getting Started

### Prerequisites

| Tool | Version |
|------|---------|
| Node.js | 20+ |
| Expo Go | Latest (installed on Android or iOS device) |
| pangea-backend | Running at `http://<server-ip>:8000` |

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/Pangean1/pangea-frontend.git
cd pangea-frontend

# 2. Install dependencies
npm install

# 3. Copy the env template and fill in your values
cp .env.example .env
nano .env
```

---

## Environment Variables

| Variable | Description |
|---|---|
| `EXPO_PUBLIC_API_URL` | Base URL of the pangea-backend API (e.g. `http://199.244.49.208:8000`) |
| `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` | Google OAuth Web Client ID (from Google Cloud Console) |
| `EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID` | Google OAuth Android Client ID |

> `.env` is gitignored and never committed. Never put private keys or secrets in environment variables prefixed with `EXPO_PUBLIC_` — they are bundled into the app binary and visible to anyone who inspects it.

---

## Running the Dev Server

Development uses **Expo Go** on a physical Android or iOS device — no emulator required.

Run this in the server terminal from the `pangea-frontend` directory:

```bash
REACT_NATIVE_PACKAGER_HOSTNAME=<your-server-ip> npx expo start
```

Then scan the QR code with the Expo Go app on your phone.

> The `REACT_NATIVE_PACKAGER_HOSTNAME` variable tells Expo to advertise the server's public IP instead of `localhost`, so a phone on a different network can reach the Metro bundler.

---

## Key Dependencies

| Package | Version | Purpose |
|---|---|---|
| `expo` | ~54.0.34 | Expo SDK |
| `expo-router` | ~6.0.23 | File-based navigation |
| `react-native` | 0.81.5 | Core framework |
| `@tanstack/react-query` | ^5.95.2 | Server state management + caching |
| `axios` | ^1.14.0 | HTTP client for backend API calls |
| `@zerodev/sdk` | ^5.5.8 | ERC-4337 account abstraction |
| `@zerodev/ecdsa-validator` | ^5.4.9 | ECDSA key validator for smart accounts |
| `wagmi` | ^3.6.0 | React hooks for Ethereum |
| `viem` | ^2.47.6 | Low-level Ethereum client |
| `expo-auth-session` | ~7.0.11 | Google OAuth flow |
| `expo-notifications` | ~0.32.17 | Firebase push notifications |
| `babel-preset-expo` | ~54.0.10 | Babel config (pinned — required for Expo SDK 54) |

---

## License

This project is released under the **MIT License**.

```
MIT License

Copyright (c) 2026 PANGEA

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```
