# 🥚 EggGacha

A Twitch Channel Point gacha and collection system built for **DragoLaminius**.

EggGacha allows Twitch viewers to spend Channel Points to roll for collectible eggs. Each egg belongs to a rarity tier, ranging from Common all the way to Eternal.

When a viewer rolls an egg, the result is displayed on an OBS overlay and automatically saved to their personal collection.

---

## ✨ Features

- 🎮 Twitch OAuth integration
- 🟣 Automatic Twitch Channel Point reward creation
- 🥚 Weighted egg gacha system
- 💾 Persistent viewer collections using SQLite
- 👤 Collections linked to Twitch users
- 📺 Animated OBS overlay
- 🖼️ Custom artwork for every egg
- 🔒 Locked and discovered egg collection slots
- 📊 Collection completion tracking
- 🌈 Rarity-specific visual effects
- ✨ Special animations for high-rarity eggs
- 🔁 Duplicate egg tracking
- ⚡ Twitch EventSub WebSocket integration

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

Example collection URL:

```text
http://localhost:3000/collection/TWITCH_USER_ID
```

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
3. An egg is selected.
4. The egg is added to the viewer's collection.
5. The result is sent to the overlay.
6. The reveal animation plays in OBS.

Higher rarity eggs have more dramatic reveal effects.

The overlay also shows whether the viewer discovered a new egg or received a duplicate.

---

## OBS Setup

Start EggGacha and add a new **Browser Source** in OBS.

Use:

```text
http://localhost:3000/overlay
```

The overlay has a transparent background and is intended to be placed directly over the stream layout.

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
```

Do **not** commit your `.env` file.

Your Twitch Client Secret should never be shared publicly or committed to Git.

---

# 🟣 Twitch Setup

EggGacha requires a Twitch Developer application.

Configure the OAuth redirect URL as:

```text
http://localhost:3000/auth/twitch/callback
```

EggGacha uses Twitch OAuth to connect the broadcaster account.

The application requests permission to manage the Channel Point reward used by EggGacha.

After authentication, EggGacha can create its own:

```text
🥚 Roll an Egg
```

Channel Point reward.

The application then listens for redemptions of that specific reward using Twitch EventSub.

---

# ▶️ Running EggGacha

Start the application with:

```bash
npm start
```

You should see something similar to:

```text
=======================
      🥚 EggGacha
=======================

EggGacha running on http://localhost:3000
Overlay: http://localhost:3000/overlay
Assets: http://localhost:3000/assets

Login with Twitch to start.
```

Open:

```text
http://localhost:3000
```

and authenticate with Twitch.

Once connected, EggGacha will create or locate its Channel Point reward and start listening for egg rolls.

---

# 💾 Collections

Viewer collections are stored locally using SQLite.

EggGacha stores:

- Twitch user ID
- Twitch display name
- Collected egg IDs
- Quantity owned
- First discovery time

Duplicates increase the quantity of the existing egg rather than creating another collection entry.

The SQLite database is intentionally excluded from Git.

```gitignore
egggacha.db
egggacha.db-shm
egggacha.db-wal
```

This means local viewer collection data will not be committed to the repository.

---

# 📁 Project Structure

```text
EggGacha/
│
├── public/
│   └── assets/
│       └── eggs/
│           └── ...
│
├── src/
│   │
│   ├── collection/
│   │   ├── collection.html
│   │   ├── collection.css
│   │   └── collection.js
│   │
│   ├── config/
│   │   └── config.js
│   │
│   ├── database/
│   │   ├── database.js
│   │   ├── users.js
│   │   └── collections.js
│   │
│   ├── gacha/
│   │   ├── eggs.js
│   │   ├── rarities.js
│   │   └── rollEgg.js
│   │
│   ├── overlay/
│   │   ├── overlay.html
│   │   └── overlay.js
│   │
│   ├── twitch/
│   │   ├── api.js
│   │   ├── auth.js
│   │   └── eventSub.js
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

# 🤝 Credits

EggGacha is a collaborative project combining software development, artwork, and ideas from multiple people.

## 💻 Development

**Undyne0123**

Development and implementation of the EggGacha application, including:

- Twitch integration
- Twitch EventSub
- Gacha system
- Database and persistent collections
- Collection interface
- OBS overlay
- Backend and application architecture

---

## 🐉 Client & Concept

**DragoLaminius**

Twitch:  
https://www.twitch.tv/dragolaminius

EggGacha was developed for the **DragoLaminius Twitch stream**.

The egg names, rarity tiers, and rarity distribution were designed collaboratively by:

**DragoLaminius & Undyne0123**

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

# 📦 Dependencies

EggGacha currently uses:

- Express
- ws
- better-sqlite3
- dotenv

These libraries remain subject to their respective licenses.

---

# 🔐 Security

Never commit or publicly share:

```text
TWITCH_CLIENT_SECRET
Twitch access tokens
Twitch refresh tokens
.env
```

The repository's `.gitignore` should keep the local `.env` file and SQLite database out of Git.

If a Client Secret is accidentally committed, revoke/rotate it through Twitch rather than simply deleting it from the latest commit.

---

# 🛠️ Development Status

EggGacha is currently under active development.

Current functionality includes:

- Twitch authentication
- Automatic EggGacha reward creation
- Channel Point redemption detection
- Weighted rarity rolls
- Persistent viewer collections
- Duplicate tracking
- Collection pages
- Rarity-separated collection display
- Animated rarity banners
- OBS egg reveal overlay
- Rarity-specific reveal effects

Additional functionality may be added as the project develops.

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
