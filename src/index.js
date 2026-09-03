import "dotenv/config";
import express from "express";
import http from "http";
import path from "path";
import { fileURLToPath } from "url";

import { config } from "./config/config.js";

import { registerAuthRoutes } from "./twitch/auth.js";
import { connectToEventSub } from "./twitch/eventSub.js";
import { getOrCreateEggReward } from "./twitch/api.js";

import { rollEgg } from "./gacha/rollEgg.js";
import { eggs } from "./gacha/eggs.js";

import {
    getOrCreateUser,
    getUserByTwitchId
} from "./database/users.js";

import {
    addEggToCollection,
    getUserCollection
} from "./database/collections.js";

import {
    startOverlayServer,
    sendEggRollToOverlay
} from "./overlay/overlay.js";


// ======================================================
// App setup
// ======================================================

const app = express();
const server = http.createServer(app);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


// ======================================================
// Static files
// ======================================================

// Egg images:
//
// public/assets/eggs/STORMHEART.png
//
// becomes:
//
// http://localhost:3000/assets/eggs/STORMHEART.png

app.use(
    "/assets",
    express.static(
        path.join(
            __dirname,
            "..",
            "public",
            "assets"
        )
    )
);


// Collection frontend files:
//
// src/collection/collection.css
// src/collection/collection.js

app.use(
    "/collection-files",
    express.static(
        path.join(
            __dirname,
            "collection"
        )
    )
);


// ======================================================
// OBS overlay WebSocket
// ======================================================

startOverlayServer(server);


// ======================================================
// App state
// ======================================================

let eventSubSocket = null;
let eggRewardId = null;


// ======================================================
// Startup message
// ======================================================

console.log("");
console.log("=======================");
console.log("      🥚 EggGacha");
console.log("=======================");
console.log("");


// ======================================================
// Twitch authentication
// ======================================================

registerAuthRoutes(
    app,
    async (twitchSession) => {

        console.log(
            `Twitch connected: ${twitchSession.broadcaster.displayName}`
        );


        // Get the EggGacha reward,
        // or create it if it does not exist.
        const eggReward =
            await getOrCreateEggReward(
                twitchSession
            );


        eggRewardId =
            eggReward.id;


        console.log(
            `Listening for EggGacha reward: ${eggReward.title}`
        );


        // Prevent multiple EventSub sockets
        // from running at the same time.
        if (eventSubSocket) {
            eventSubSocket.close();
        }


        eventSubSocket =
            connectToEventSub(
                twitchSession,
                handleRedemption
            );
    }
);


// ======================================================
// Twitch Channel Point redemption
// ======================================================

async function handleRedemption(event) {

    // Ignore every reward except
    // EggGacha's own reward.
    if (
        event.reward.id !==
        eggRewardId
    ) {
        return;
    }


    // Roll rarity + egg.
    const egg =
        rollEgg();


    // Find viewer or create them
    // if this is their first roll.
    const user =
        getOrCreateUser(
            event.user_id,
            event.user_name
        );


    // Add the egg to their collection.
    const collectionEntry =
        addEggToCollection(
            user.id,
            egg.id
        );


    console.log("");
    console.log("🥚 Egg rolled!");
    console.log(
        "Viewer:",
        user.display_name
    );

    console.log(
        "Viewer ID:",
        event.user_id
    );

    console.log(
        "Egg:",
        egg.name
    );

    console.log(
        "Rarity:",
        egg.rarity
    );

    console.log(
        "Owned:",
        collectionEntry.quantity
    );

    console.log("");


    // Send the result to the OBS overlay.
    sendEggRollToOverlay(
        user,
        egg,
        collectionEntry.quantity
    );
}


// ======================================================
// OBS overlay page
// ======================================================

app.get(
    "/overlay",
    (req, res) => {

        res.sendFile(
            path.join(
                __dirname,
                "overlay",
                "overlay.html"
            )
        );
    }
);


// ======================================================
// Collection page
// ======================================================

app.get(
    "/collection/:twitchUserId",
    (req, res) => {

        res.sendFile(
            path.join(
                __dirname,
                "collection",
                "collection.html"
            )
        );
    }
);


// ======================================================
// Collection API
// ======================================================

app.get(
    "/api/collection/:twitchUserId",
    (req, res) => {

        const twitchUserId =
            req.params.twitchUserId;


        const user =
            getUserByTwitchId(
                twitchUserId
            );


        if (!user) {

            return res
                .status(404)
                .json({
                    error:
                        "Viewer not found."
                });
        }


        const collection =
            getUserCollection(
                user.id
            );


        // Total number of eggs,
        // including duplicates.
        const totalEggs =
            collection.reduce(
                (
                    total,
                    entry
                ) =>
                    total +
                    entry.quantity,
                0
            );


        // Number of unique valid eggs
        // the viewer owns.
        const uniqueEggs =
            collection.filter(
                entry =>
                    entry.egg
            ).length;


        const completion =
            Math.round(
                (
                    uniqueEggs /
                    eggs.length
                ) * 100
            );


        // Build a list containing
        // every egg in the game.
        //
        // This allows the frontend
        // to also show locked eggs.
        const collectionEggs =
            eggs.map(
                egg => {

                    const collectionEntry =
                        collection.find(
                            entry =>
                                entry.egg_id ===
                                egg.id
                        );


                    return {
                        id:
                            egg.id,

                        name:
                            egg.name,

                        rarity:
                            egg.rarity,

                        image:
                            egg.image,

                        unlocked:
                            Boolean(
                                collectionEntry
                            ),

                        quantity:
                            collectionEntry
                                ?.quantity ?? 0
                    };
                }
            );


        res.json({
            user: {
                twitchUserId:
                    user.twitch_user_id,

                displayName:
                    user.display_name
            },

            stats: {
                totalEggs,
                uniqueEggs,

                totalAvailable:
                    eggs.length,

                completion
            },

            eggs:
                collectionEggs
        });
    }
);


// ======================================================
// Start server
// ======================================================

server.listen(
    config.server.port,
    () => {

        console.log(
            `EggGacha running on http://localhost:${config.server.port}`
        );

        console.log(
            `Overlay: http://localhost:${config.server.port}/overlay`
        );

        console.log(
            `Assets: http://localhost:${config.server.port}/assets`
        );

        console.log("");
        console.log(
            "Login with Twitch to start."
        );

        console.log("");
    }
);