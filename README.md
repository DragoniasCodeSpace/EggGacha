# 🥚 EggGacha

A Twitch Channel Point gacha and collection system built for **Dragolaminius**.

EggGacha allows Twitch viewers to spend Channel Points to roll for collectible eggs. Each egg belongs to a rarity tier, ranging from Common all the way to Eternal.

When a viewer rolls an egg, the result is displayed on an OBS overlay and automatically saved to their personal collection.

---

## ✨ Features

- 🎮 Twitch OAuth integration
- 🟣 Automatic Twitch Channel Point reward creation and synchronization
- 🥚 Weighted egg gacha system
- 💾 Persistent viewer collections using Cloudflare D1
- 👤 Collections linked to Twitch users
- 🔗 Private token-based collection links
- 💬 `!eggs` and `!collection` Twitch chat commands
- 📺 Animated OBS overlay
- 🖼️ Custom artwork for every egg
- 🔒 Locked and discovered egg collection slots
- 📊 Collection completion tracking
- 🌈 Rarity-specific visual effects
- ✨ Special animations for high-rarity eggs
- 🔁 Duplicate egg tracking
- ⚡ Twitch EventSub Webhook integration
- 🔑 Persistent Twitch OAuth sessions
- 🔐 Encrypted Twitch tokens at rest
- 🛡️ Protected OBS overlay WebSocket
- ☁️ Cloudflare Workers hosting
- 🗄️ Cloudflare D1 database
- 🔌 Cloudflare Durable Objects for the OBS WebSocket

---

# 🥚 Egg Collection

Every viewer has their own persistent egg collection.

The collection page displays:

- Total eggs collected
- Unique eggs discovered
- Overall collection completion
- Progress for each rarity
- Quantity owned for discovered eggs
- Locked silhouettes for undiscovered eggs

Collections are separated by rarity, with higher rarities receiving increasingly special visual effects.

Collection pages use a randomly generated private token rather than exposing the viewer's Twitch user ID.

Example collection URL:

```text
https://egggacha.undyne.workers.dev/collection/YOUR_PRIVATE_COLLECTION_TOKEN
```

The collection is private-by-link. Anyone with the collection link can view it, so collection links should only be shared when intended.

Viewers can retrieve their own collection link directly from Twitch chat using:

```text
!eggs
```

or:

```text
!collection
```

EggGacha responds in Twitch chat with that viewer's personal collection URL.

---

# 🎲 Rarities

EggGacha first rolls a rarity and then randomly selects an egg from that rarity.

| Rarity | Chance |
|---|---:|
| Common | 49% |
| Uncommon | 25% |
| Rare | 12% |
| Epic | 6% |
| Legendary | 3% |
| Exotic | 2.5% |
| Mythic | 1.9% |
| Ancient | 0.55% |
| Eternal | 0.05% |

The total probability is **100%**.

Once a rarity has been selected, every egg within that rarity has an equal chance of being selected.

For example, if a rarity has four eggs, each egg receives one quarter of that rarity's probability.

---

# 🐉 Eggs

EggGacha currently contains **27 collectible eggs** across nine rarity tiers.

### Common

- Ember-Specked Egg
- Moss-Covered Egg
- Dewdrop Egg
- Gale Touched Egg
- Ashen Egg
- Duskhollow Egg
- Sunbleached Egg

### Uncommon

- Frostshell Egg
- Ironscale Egg
- Thornspine Egg
- Cindercore Egg
- Mistweave Egg

### Rare

- Stormheart Egg
- Glimmerstone Egg
- Mirage Egg
- Tidalflare Egg

### Epic

- Obsidian Vein Egg
- Voidborn Egg
- Aurora Egg

### Legendary

- Infernal Crown Egg
- Celestia Egg

### Exotic

- Draconic Prism Egg
- Echo of Eternity Egg

### Mythic

- Heart of the World Egg
- Astralwyrm Egg

### Ancient

- Dawnscale Egg

### Eternal

- Eternis Egg

---

# 📺 OBS Overlay

EggGacha includes a browser-based overlay designed for OBS.

When a viewer redeems the EggGacha Channel Point reward:

1. Twitch sends the redemption to EggGacha through an EventSub Webhook.
2. EggGacha rolls a rarity.
3. An egg is selected from that rarity.
4. The egg is stored in the viewer's Cloudflare D1 collection.
5. The result is sent to a Cloudflare Durable Object.
6. The Durable Object broadcasts the result to connected OBS overlays through a WebSocket.
7. The reveal animation plays in OBS.

Higher-rarity eggs have increasingly dramatic reveal effects.

The overlay also shows whether the viewer discovered a new egg or received a duplicate.

---

## OBS Setup

The OBS overlay is protected using an `OVERLAY_SECRET`.

The production overlay URL follows this format:

```text
https://egggacha.undyne.workers.dev/overlay?key=YOUR_OVERLAY_SECRET
```

Replace `YOUR_OVERLAY_SECRET` with the secret configured in Cloudflare.

The overlay has a transparent background and is intended to be placed directly over the stream layout.

### Important

Do not publicly share the complete overlay URL when it contains the real overlay secret.

The secret is used to authorize access to both the overlay page and its WebSocket connection.

---

# ☁️ Architecture

EggGacha runs primarily on Cloudflare's serverless infrastructure.

```text
Twitch
   │
   ▼
EventSub Webhooks
   │
   ▼
Cloudflare Worker
   │
   ├── Twitch OAuth
   ├── Channel Point rewards
   ├── Twitch chat commands
   ├── Gacha processing
   ├── Collection API
   │
   ├──────────────► Cloudflare D1
   │
   ▼
Durable Object
   │
   ▼
WebSocket
   │
   ▼
OBS Overlay
```

The application uses:

- **Cloudflare Workers** for the application backend
- **Cloudflare D1** for persistent data
- **Cloudflare Durable Objects** for the OBS WebSocket
- **Cloudflare Static Assets** for the frontend
- **Twitch Helix API** for Twitch integration
- **Twitch EventSub Webhooks** for Channel Point redemptions and chat messages
- **Wrangler** for development and deployment

The gacha logic is kept separate from the Cloudflare and Twitch integrations.

This allows the egg rolling system to remain independent of the hosting and Twitch infrastructure.

---

# 🚀 Installation

## Requirements

You will need:

- Node.js
- npm
- A Cloudflare account
- A Twitch account
- A Twitch Developer application
- OBS Studio if you want to use the stream overlay

Node.js is used for local development tooling and Wrangler. The production application itself runs on Cloudflare Workers.

---

## 1. Clone the repository

```bash
git clone https://github.com/DragoniasCodeSpace/EggGacha.git
```

Enter the project directory:

```bash
cd EggGacha
```

---

## 2. Install dependencies

```bash
npm install
```

---

## 3. Cloudflare authentication

Authenticate Wrangler with your Cloudflare account:

```bash
npx wrangler login
```

You can verify the authenticated account with:

```bash
npx wrangler whoami
```

---

## 4. Cloudflare D1

EggGacha uses Cloudflare D1 for persistent application data.

The D1 database is bound to the Worker as:

```text
DB
```

Database migrations are stored in:

```text
migrations/
```

Apply migrations to the remote database with:

```bash
npx wrangler d1 migrations apply egggacha --remote
```

---

# 🔐 Secrets

Sensitive configuration must not be committed to Git.

EggGacha uses the following Cloudflare secrets:

```text
TWITCH_CLIENT_ID
TWITCH_CLIENT_SECRET
SESSION_ENCRYPTION_KEY
OVERLAY_SECRET
TWITCH_EVENTSUB_SECRET
```

Set a production secret using Wrangler:

```bash
npx wrangler secret put TWITCH_CLIENT_ID
```

Repeat this for each secret.

Never publicly share:

- `TWITCH_CLIENT_SECRET`
- `SESSION_ENCRYPTION_KEY`
- `OVERLAY_SECRET`
- `TWITCH_EVENTSUB_SECRET`
- Twitch access tokens
- Twitch refresh tokens

---

## Local development secrets

For local Wrangler development, create:

```text
.dev.vars
```

You can use `.dev.vars.example` as a template.

Example:

```env
TWITCH_CLIENT_ID=your_twitch_client_id
TWITCH_CLIENT_SECRET=your_twitch_client_secret

SESSION_ENCRYPTION_KEY=your_session_encryption_key
OVERLAY_SECRET=your_overlay_secret
TWITCH_EVENTSUB_SECRET=your_eventsub_secret
```

Do **not** commit `.dev.vars`.

---

## Generate a session encryption key

EggGacha encrypts stored Twitch access and refresh tokens.

Generate a random 32-byte key:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

Then configure it as:

```text
SESSION_ENCRYPTION_KEY
```

The same encryption key must be retained.

If the key is lost or changed, previously encrypted Twitch sessions can no longer be decrypted and Twitch will need to be reconnected.

---

## Generate an overlay secret

Generate a random overlay secret:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Configure it as:

```text
OVERLAY_SECRET
```

Do not commit or publicly share this value.

---

## Generate an EventSub secret

The EventSub secret is used to verify that incoming EventSub Webhook requests genuinely came from Twitch.

Generate a random value:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Configure it as:

```text
TWITCH_EVENTSUB_SECRET
```

Do not commit or publicly share this value.

---

# 🟣 Twitch Setup

EggGacha requires a Twitch Developer application.

The production OAuth callback is:

```text
https://egggacha.undyne.workers.dev/auth/twitch/callback
```

This callback must be registered in the Twitch Developer application.

EggGacha uses Twitch OAuth to connect the broadcaster account.

The application currently requests:

```text
channel:manage:redemptions
user:read:chat
user:write:chat
user:bot
channel:bot
```

These permissions allow EggGacha to:

- Manage its Channel Point reward
- Receive Channel Point redemptions
- Receive Twitch chat messages
- Respond to collection commands in Twitch chat

After authentication, EggGacha creates or locates its own:

```text
🥚 Roll an Egg
```

Channel Point reward.

The reward ID is stored in D1 so the application can continue managing the same reward.

EggGacha then creates the required Twitch EventSub Webhook subscriptions.

---

# ▶️ Development

Start the Cloudflare Worker locally using:

```bash
npm run dev
```

This runs:

```bash
wrangler dev
```

Production deployments use:

```bash
npm run deploy
```

which runs:

```bash
wrangler deploy
```

---

# 🔄 Twitch Sessions

EggGacha stores Twitch OAuth sessions in Cloudflare D1.

Access and refresh tokens are encrypted before being written to the database.

EggGacha can automatically refresh expired Twitch access tokens and validate existing sessions.

This allows the broadcaster connection to remain persistent without storing Twitch credentials in plain text.

---

# ⚡ Twitch EventSub

EggGacha uses **Twitch EventSub Webhooks** rather than maintaining a permanent outbound EventSub WebSocket connection.

The Worker exposes an EventSub endpoint that:

- Verifies Twitch HMAC signatures
- Verifies message timestamps
- Handles Twitch verification challenges
- Handles subscription revocations
- Rejects duplicate EventSub messages
- Processes Channel Point redemptions
- Processes Twitch chat messages

Processed EventSub message IDs are stored so Twitch retries do not result in duplicate processing.

---

# 💬 Twitch Chat Commands

EggGacha listens for collection commands through Twitch EventSub.

Viewers can use:

```text
!eggs
```

or:

```text
!collection
```

EggGacha identifies the viewer using their Twitch user ID internally and responds with that viewer's private collection URL.

The Twitch user ID itself is not exposed in the collection URL.

---

# 💾 Collections

Viewer collections are stored using **Cloudflare D1**.

EggGacha stores information including:

- Twitch user ID
- Twitch display name
- Private collection token
- Collected egg IDs
- Quantity owned
- First discovery time

Duplicates increase the quantity of the existing egg rather than creating another collection entry.

Each viewer receives a randomly generated collection token.

The token is used for URLs such as:

```text
/collection/PRIVATE_COLLECTION_TOKEN
```

rather than:

```text
/collection/TWITCH_USER_ID
```

This prevents collections from being trivially discovered from Twitch usernames or user IDs.

---

# 📁 Project Structure

```text
EggGacha/
├── migrations/
│   ├── 0001_initial.sql
│   ├── 0002_oauth_states.sql
│   └── 0003_eventsub_messages.sql
│
├── public/
│   ├── assets/
│   │   └── eggs/
│   │       └── ...
│   │
│   ├── auth-files/
│   │   ├── login.html
│   │   ├── login.css
│   │   └── login.js
│   │
│   ├── collection-files/
│   │   ├── collection.html
│   │   ├── collection.css
│   │   └── collection.js
│   │
│   ├── overlay-files/
│   │   ├── overlay.html
│   │   ├── overlay.css
│   │   └── overlayClient.js
│   │
│   └── styles/
│       └── theme.css
│
├── src/
│   ├── cloudflare/
│   │   ├── database/
│   │   │   ├── collections.js
│   │   │   ├── eventSubMessages.js
│   │   │   ├── oauthStates.js
│   │   │   ├── twitchRewards.js
│   │   │   ├── twitchSessions.js
│   │   │   └── users.js
│   │   │
│   │   ├── overlay/
│   │   │   └── OverlayDurableObject.js
│   │   │
│   │   ├── security/
│   │   │   └── encryption.js
│   │   │
│   │   ├── twitch/
│   │   │   ├── api.js
│   │   │   ├── auth.js
│   │   │   ├── chat.js
│   │   │   ├── eventSubSubscriptions.js
│   │   │   ├── eventSubWebhook.js
│   │   │   ├── redemptions.js
│   │   │   ├── rewards.js
│   │   │   └── session.js
│   │   │
│   │   └── worker.js
│   │
│   └── gacha/
│       ├── eggs.js
│       ├── rarities.js
│       └── rollEgg.js
│
├── .dev.vars.example
├── .gitignore
├── package.json
├── package-lock.json
├── wrangler.jsonc
└── README.md
```

---

# ⚙️ How It Works

The main EggGacha redemption flow is:

```text
Viewer
   │
   ▼
Channel Point Redemption
   │
   ▼
Twitch EventSub Webhook
   │
   ▼
Cloudflare Worker
   │
   ├── Verify EventSub request
   │
   ├── Verify EggGacha reward
   │
   ▼
Roll Rarity
   │
   ▼
Select Egg
   │
   ├──────────────► Cloudflare D1 Collection
   │
   ▼
Durable Object
   │
   ▼
WebSocket
   │
   ▼
OBS Egg Reveal
```

The gacha system itself is kept separate from the Twitch integration.

The egg rolling logic can therefore be used without depending directly on Twitch or Cloudflare.

---

# 🔐 Security

EggGacha includes several security measures intended to protect the Twitch integration and application.

### OAuth State Protection

Twitch OAuth requests use temporary, single-use state values.

OAuth states expire after a limited period and cannot be reused after a successful callback.

### Token Encryption

Twitch access and refresh tokens stored in D1 are encrypted before storage.

The encryption key is stored separately as a Cloudflare secret.

### EventSub Verification

Incoming Twitch EventSub requests are cryptographically verified using Twitch's HMAC signature.

Duplicate EventSub message IDs are tracked to prevent Twitch retries from processing the same event more than once.

### Private Collection Tokens

Collection URLs use randomly generated tokens rather than Twitch user IDs.

This prevents collection pages from being easily discovered simply by knowing someone's Twitch ID or username.

These links are private-by-link rather than authenticated.

### Protected Overlay

The OBS overlay and WebSocket require the configured `OVERLAY_SECRET`.

Connections without the correct secret are rejected.

### Secrets

Never commit or publicly share:

```text
TWITCH_CLIENT_SECRET
SESSION_ENCRYPTION_KEY
OVERLAY_SECRET
TWITCH_EVENTSUB_SECRET
Twitch access tokens
Twitch refresh tokens
.dev.vars
.env
```

If a secret is accidentally committed, rotate it rather than simply deleting it from the latest commit because it may remain in Git history.

---

# 🤝 Credits

EggGacha is a collaborative project combining software development, artwork, and ideas from multiple people.

## 💻 Development

**Undyne0123**

Development and implementation of the EggGacha application, including:

- Twitch integration
- Twitch EventSub
- Twitch chat integration
- Gacha system
- Cloudflare infrastructure
- Database and persistent collections
- Collection interface
- OBS overlay
- Security implementation
- Backend and application architecture

---

## 🐉 Client & Concept

**Dragolaminius**

Twitch:  
https://www.twitch.tv/dragolaminius

EggGacha was developed for the **Dragolaminius Twitch stream**.

The egg names, rarity tiers, and rarity distribution were designed collaboratively by:

**Dragolaminius & Undyne0123**

---

## 🎨 Egg Artwork

Egg artwork was created by:

**l0caldoodles / Boxxdude**

Instagram:  
https://www.instagram.com/l0caldoodles/

Twitch:  
https://www.twitch.tv/boxxdude

VGen:  
*Link coming soon.*

A large part of EggGacha's identity comes from the custom egg artwork, so please support the artist through their pages above.

### Artwork Usage

The egg artwork is **not automatically covered by any license applied to the EggGacha source code**.

Please do not reuse, redistribute, modify, sell, or otherwise use the egg artwork without permission from the artist/rightsholder.

---

# 📦 Infrastructure & Dependencies

EggGacha currently uses:

- Cloudflare Workers
- Cloudflare D1
- Cloudflare Durable Objects
- Cloudflare Static Assets
- Wrangler
- Twitch Helix API
- Twitch EventSub Webhooks

Wrangler is installed as a development dependency through npm.

---

# 🛠️ Development Status

EggGacha is currently under active development.

Current functionality includes:

- Twitch authentication
- Persistent encrypted Twitch sessions
- Automatic Twitch token refresh
- Automatic EggGacha reward creation and synchronization
- Channel Point redemption detection through EventSub Webhooks
- Twitch chat collection commands
- Weighted rarity rolls
- Persistent Cloudflare D1 viewer collections
- Private collection tokens
- Duplicate tracking
- Collection pages
- Rarity-separated collection display
- Animated rarity banners
- OBS egg reveal overlay
- Protected overlay WebSocket
- Rarity-specific reveal effects
- EventSub HMAC verification
- Duplicate EventSub protection
- Cloudflare Worker deployment

Additional functionality may be added as the project develops.

---

# 🌐 Hosting

EggGacha is hosted using Cloudflare.

The production Worker is available at:

```text
https://egggacha.undyne.workers.dev
```

Cloudflare provides:

- Serverless Worker execution
- Persistent D1 database storage
- Durable Object WebSocket handling
- Static asset hosting
- HTTPS
- Secure secret storage

The application therefore does not require a continuously running local Node.js server.

---

# 📜 License

A source-code license has not yet been specified for EggGacha.

Until a license is explicitly added, do not assume that the repository's source code or assets are available for unrestricted reuse.

The custom egg artwork is separate from the source code and must not be treated as open-source material simply because it is present in this repository.

See the **Credits** section for artwork attribution.

---

<p align="center">
  🥚 <strong>EggGacha</strong> 🐉
</p>

<p align="center">
  Built by <strong>Undyne0123</strong> for <strong>DragoLaminius</strong>
</p>