# 🥚 EggGacha

A Twitch Channel Point gacha and collection system built for **Dragolaminius**.

EggGacha allows Twitch viewers to spend Channel Points to roll for collectible eggs. Each egg belongs to a rarity tier, ranging from Common all the way to Eternal.

When a viewer rolls an egg, the result is displayed on an OBS overlay and automatically saved to their personal collection.

---

## ✨ Features

- 🎮 Twitch OAuth integration
- 🟣 Automatic Twitch Channel Point reward creation and synchronization
- 🥚 Weighted egg gacha system
- 💾 Persistent viewer collections using SQLite
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
- ⚡ Twitch EventSub WebSocket integration
- 🔄 Automatic EventSub reconnection
- 🔑 Persistent Twitch OAuth sessions
- 🔐 Encrypted Twitch tokens at rest
- 🛡️ Protected OBS overlay WebSocket
- 🚦 API and authentication rate limiting
- 🔒 Content Security Policy and security headers

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
http://localhost:3000/collection/YOUR_PRIVATE_COLLECTION_TOKEN
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

1. Twitch sends the redemption through EventSub.
2. EggGacha rolls a rarity.
3. An egg is selected from that rarity.
4. The egg is added to the viewer's collection.
5. The result is sent to the overlay through a WebSocket.
6. The reveal animation plays in OBS.

Higher-rarity eggs have increasingly dramatic reveal effects.

The overlay also shows whether the viewer discovered a new egg or received a duplicate.

---

## OBS Setup

The overlay is protected using the `OVERLAY_SECRET` configured in the environment.

Start EggGacha and add a new **Browser Source** in OBS.

For local development, use:

```text
http://localhost:3000/overlay?key=YOUR_OVERLAY_SECRET
```

Replace `YOUR_OVERLAY_SECRET` with the secret stored in your `.env` file.

The overlay has a transparent background and is intended to be placed directly over the stream layout.

### Important

Do not publicly share your overlay URL when it contains the real overlay secret.

The secret is used to authorize the WebSocket connection between the browser overlay and EggGacha.

---

# 🚀 Installation

## Requirements

You will need:

- Node.js
- npm
- A Twitch account
- A Twitch Developer application
- OBS Studio if you want to use the stream overlay

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

## 3. Create your environment file

Create a file named:

```text
.env
```

You can use `.env.example` as a template.

```env
TWITCH_CLIENT_ID=your_client_id
TWITCH_CLIENT_SECRET=your_client_secret
TWITCH_REDIRECT_URI=http://localhost:3000/auth/twitch/callback

PORT=3000
PUBLIC_URL=http://localhost:3000

EGG_REWARD_TITLE=🥚 Roll an Egg
EGG_REWARD_COST=100

SESSION_ENCRYPTION_KEY=your_encryption_key
OVERLAY_SECRET=your_overlay_secret
```

Do **not** commit your `.env` file.

Never publicly share:

- `TWITCH_CLIENT_SECRET`
- `SESSION_ENCRYPTION_KEY`
- `OVERLAY_SECRET`
- Twitch access tokens
- Twitch refresh tokens

---

## 4. Generate a session encryption key

EggGacha encrypts stored Twitch access and refresh tokens using AES-256-GCM.

Generate a random 32-byte key:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

Place the result in:

```env
SESSION_ENCRYPTION_KEY=YOUR_GENERATED_KEY
```

The same key must be kept between application restarts.

If the key is lost or changed, existing encrypted Twitch sessions can no longer be decrypted and Twitch will need to be reconnected.

---

## 5. Generate an overlay secret

Generate a random overlay secret:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Place the result in:

```env
OVERLAY_SECRET=YOUR_GENERATED_SECRET
```

Do not commit or publicly share this value.

---

# 🟣 Twitch Setup

EggGacha requires a Twitch Developer application.

For local development, configure the OAuth redirect URL as:

```text
http://localhost:3000/auth/twitch/callback
```

This URL must match the `TWITCH_REDIRECT_URI` configured in `.env`.

EggGacha uses Twitch OAuth to connect the broadcaster account.

The application requires permissions for:

```text
channel:manage:redemptions
user:read:chat
user:write:chat
```

These permissions allow EggGacha to:

- Manage its Channel Point reward
- Receive Channel Point redemptions
- Read Twitch chat messages
- Respond to collection commands in Twitch chat

After authentication, EggGacha creates or locates its own:

```text
🥚 Roll an Egg
```

Channel Point reward.

The reward ID is stored by EggGacha so the application can continue managing the same reward even if its title or configuration changes.

EggGacha then listens for redemptions of that specific reward using Twitch EventSub.

---

# ▶️ Running EggGacha

Start the application with:

```bash
npm start
```

Then open:

```text
http://localhost:3000
```

and authenticate with Twitch.

Once connected, EggGacha will:

1. Restore an existing Twitch session when possible.
2. Validate or refresh the OAuth session.
3. Create or synchronize the EggGacha Channel Point reward.
4. Connect to Twitch EventSub.
5. Subscribe to reward redemptions and Twitch chat.
6. Start listening for egg rolls and collection commands.

---

# 🔄 Twitch Sessions

EggGacha stores the Twitch OAuth session in SQLite so the broadcaster does not need to reconnect every time the application restarts.

Stored access and refresh tokens are encrypted using **AES-256-GCM** before being written to the database.

EggGacha can automatically refresh expired Twitch access tokens.

It also periodically validates the current session.

If a Twitch API request returns an authentication failure, EggGacha can refresh the session and retry the request once.

---

# ⚡ EventSub Reliability

EggGacha uses Twitch EventSub over WebSockets.

The EventSub connection includes:

- Twitch-requested WebSocket reconnection handling
- Keepalive monitoring
- Automatic recovery from lost connections
- Retry backoff for failed connections
- Automatic subscription creation for new EventSub sessions

If the internet connection is temporarily lost, EggGacha will attempt to reconnect automatically.

Reconnect attempts gradually back off to avoid repeatedly hammering Twitch while the connection is unavailable.

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

Viewer collections are stored locally using SQLite.

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

The SQLite database is intentionally excluded from Git:

```gitignore
egggacha.db
egggacha.db-shm
egggacha.db-wal
```

This prevents local viewer collection data and Twitch session data from being committed to the repository.

For production hosting, the SQLite database must be stored on persistent storage so collections survive application restarts and deployments.

---

# 📁 Project Structure

```text
EggGacha/
├── public/
│   └── assets/
│       └── eggs/
│           └── ...
│
├── src/
│   ├── auth/
│   │   ├── login.html
│   │   ├── login.css
│   │   └── login.js
│   │
│   ├── collection/
│   │   ├── collection.html
│   │   ├── collection.css
│   │   └── collection.js
│   │
│   ├── config/
│   │   ├── config.js
│   │   └── validateConfig.js
│   │
│   ├── database/
│   │   ├── database.js
│   │   ├── users.js
│   │   ├── collections.js
│   │   └── twitchRewards.js
│   │
│   ├── gacha/
│   │   ├── eggs.js
│   │   ├── rarities.js
│   │   └── rollEgg.js
│   │
│   ├── overlay/
│   │   ├── overlay.html
│   │   ├── overlay.css
│   │   ├── overlay.js
│   │   └── overlayClient.js
│   │
│   ├── security/
│   │   └── encryption.js
│   │
│   ├── styles/
│   │   └── theme.css
│   │
│   ├── twitch/
│   │   ├── api.js
│   │   ├── auth.js
│   │   ├── chat.js
│   │   ├── eventSub.js
│   │   └── session.js
│   │
│   └── index.js
│
├── .env.example
├── .gitignore
├── package.json
└── README.md
```

---

# ⚙️ How It Works

The main EggGacha flow is:

```text
Twitch
   │
   ▼
Channel Point Redemption
   │
   ▼
Twitch EventSub
   │
   ▼
EggGacha
   │
   ├── Roll Rarity
   │
   ▼
Select Egg
   │
   ├──────────────► SQLite Collection
   │
   ▼
Overlay WebSocket
   │
   ▼
OBS Egg Reveal
```

The gacha system itself is kept separate from the Twitch integration.

This means the egg rolling logic is not dependent on Twitch and can potentially be reused by other parts of the application in the future.

---

# 🔐 Security

EggGacha includes several security measures intended to protect the Twitch integration and application.

### OAuth State Protection

Twitch OAuth requests use temporary, single-use state values to help protect the OAuth flow.

OAuth states expire after a limited period and cannot be reused after a successful callback.

### Token Encryption

Twitch access and refresh tokens stored in SQLite are encrypted using AES-256-GCM.

The encryption key is stored separately in the environment.

### Private Collection Tokens

Public collection URLs use randomly generated tokens rather than Twitch user IDs.

This prevents collection pages from being easily discovered simply by knowing someone's Twitch ID or username.

These links are private-by-link rather than authenticated.

### Protected Overlay

The OBS overlay WebSocket requires the configured `OVERLAY_SECRET`.

Connections without the correct secret are rejected.

### HTTP Security

EggGacha uses security measures including:

- Helmet security headers
- Content Security Policy
- API rate limiting
- Authentication rate limiting
- Limited request body sizes
- Restricted static file exposure
- Disabled `X-Powered-By` header

### Secrets

Never commit or publicly share:

```text
TWITCH_CLIENT_SECRET
SESSION_ENCRYPTION_KEY
OVERLAY_SECRET
Twitch access tokens
Twitch refresh tokens
.env
```

The repository's `.gitignore` should keep the local `.env` file and SQLite database out of Git.

If a Twitch Client Secret is accidentally committed, revoke and rotate it through Twitch rather than simply deleting it from the latest commit.

The same principle applies to other secrets that may have been exposed through Git history.

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

**l0caldoodles / BoxxDude**

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

# 📦 Dependencies

EggGacha currently uses:

- Express
- ws
- better-sqlite3
- dotenv
- helmet
- express-rate-limit

These libraries remain subject to their respective licenses.

---

# 🛠️ Development Status

EggGacha is currently under active development.

Current functionality includes:

- Twitch authentication
- Persistent encrypted Twitch sessions
- Automatic Twitch token refresh
- Automatic EggGacha reward creation and synchronization
- Channel Point redemption detection
- Twitch chat collection commands
- Weighted rarity rolls
- Persistent viewer collections
- Private collection tokens
- Duplicate tracking
- Collection pages
- Rarity-separated collection display
- Animated rarity banners
- OBS egg reveal overlay
- Protected overlay WebSocket
- Rarity-specific reveal effects
- Automatic EventSub reconnection
- EventSub keepalive monitoring
- HTTP security headers and rate limiting

Additional functionality may be added as the project develops.

---

# 🌐 Hosting

EggGacha is currently designed to run locally during development.

Production hosting requires:

- A continuously running Node.js environment
- Persistent storage for the SQLite database
- HTTPS
- A public URL
- A matching Twitch OAuth redirect URL
- Secure environment variable storage
- WebSocket support

When deployed, `PUBLIC_URL` and `TWITCH_REDIRECT_URI` should be changed from their localhost values to the production HTTPS address.

The SQLite database must remain on persistent storage so viewer collections, Twitch sessions, and saved reward information survive application restarts.

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
  Built by <strong>Undyne0123</strong> for <strong>Dragolaminius</strong>
</p>