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
    getUserByTwitchId,
    getUserByDisplayName
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

const __filename =
    fileURLToPath(import.meta.url);

const __dirname =
    path.dirname(__filename);


// ======================================================
// Static files
// ======================================================

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


app.use(
    "/collection-files",
    express.static(
        path.join(
            __dirname,
            "collection"
        )
    )
);


app.use(
    "/overlay-files",
    express.static(
        path.join(
            __dirname,
            "overlay"
        )
    )
);


app.use(
    "/auth-files",
    express.static(
        path.join(
            __dirname,
            "auth"
        )
    )
);


app.use(
    "/styles",
    express.static(
        path.join(
            __dirname,
            "styles"
        )
    )
);


// ======================================================
// OBS overlay WebSocket
// ======================================================

startOverlayServer(server);


// ======================================================
// Application state
// ======================================================

let eventSubSocket = null;
let eggRewardId = null;


// ======================================================
// Startup
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


        const eggReward =
            await getOrCreateEggReward(
                twitchSession
            );


        eggRewardId =
            eggReward.id;


        console.log(
            `Listening for EggGacha reward: ${eggReward.title}`
        );


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

    if (
        event.reward.id !==
        eggRewardId
    ) {
        return;
    }


    const egg =
        rollEgg();


    const user =
        getOrCreateUser(
            event.user_id,
            event.user_name
        );


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
    "/collection/:viewer",
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
    "/api/collection/:viewer",
    (req, res) => {

        const viewer =
            req.params.viewer;


        let user;


        if (/^\d+$/.test(viewer)) {

            user =
                getUserByTwitchId(
                    viewer
                );

        } else {

            user =
                getUserByDisplayName(
                    viewer
                );

        }


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


        // ==================================================
        // Collection statistics
        // ==================================================

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


        const uniqueEggs =
            collection.filter(
                entry =>
                    entry.egg
            ).length;


        const totalAvailable =
            eggs.length;


        const completion =
            totalAvailable === 0
                ? 0
                : Math.round(
                    (
                        uniqueEggs /
                        totalAvailable
                    ) * 100
                );


        // ==================================================
        // Complete egg list
        // ==================================================

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
                                ?.quantity ?? 0,

                        firstObtainedAt:
                            collectionEntry
                                ?.first_obtained_at
                                ?? null
                    };
                }
            );


        // ==================================================
        // Response
        // ==================================================

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
                totalAvailable,
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