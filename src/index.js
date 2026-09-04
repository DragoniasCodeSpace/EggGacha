import "dotenv/config";

import express from "express";
import http from "http";
import path from "path";
import { fileURLToPath } from "url";

import { registerAuthRoutes } from "./twitch/auth.js";
import { connectToEventSub } from "./twitch/eventSub.js";
import { getOrCreateEggReward } from "./twitch/api.js";
import { sendChatMessage } from "./twitch/chat.js";

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
// Paths
// ======================================================

const __filename =
    fileURLToPath(
        import.meta.url
    );

const __dirname =
    path.dirname(
        __filename
    );


// ======================================================
// Express + HTTP server
// ======================================================

const app =
    express();

const server =
    http.createServer(
        app
    );


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
// Overlay WebSocket
// ======================================================

startOverlayServer(
    server
);


// ======================================================
// Twitch state
// ======================================================

let eventSubSocket =
    null;

let eggRewardId =
    null;


// ======================================================
// Twitch authentication
// ======================================================

registerAuthRoutes(
    app,
    async twitchSession => {

        console.log(
            `Connecting EggGacha for ${twitchSession.broadcaster.displayName}...`
        );


        // ==============================================
        // EggGacha reward
        // ==============================================

        const reward =
            await getOrCreateEggReward(
                twitchSession
            );


        eggRewardId =
            reward.id;


        console.log(
            "EggGacha reward ready ✓"
        );

        console.log(
            "Reward ID:",
            eggRewardId
        );


        // ==============================================
        // Close old EventSub connection
        // ==============================================

        if (eventSubSocket) {

            try {

                eventSubSocket.close();

            } catch (error) {

                console.error(
                    "Failed to close old EventSub connection:",
                    error
                );

            }


            eventSubSocket =
                null;

        }


        // ==============================================
        // EventSub
        // ==============================================

        eventSubSocket =
            connectToEventSub(
                twitchSession,

                async event => {

                    await handleRedemption(
                        event
                    );

                },

                async event => {

                    await handleChatMessage(
                        twitchSession,
                        event
                    );

                }
            );


        console.log(
            "EggGacha Twitch connection ready ✓"
        );

    }
);


// ======================================================
// Handle egg redemption
// ======================================================

async function handleRedemption(
    event
) {

    try {

        if (
            !eggRewardId ||
            event.reward?.id !== eggRewardId
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


        console.log(
            `${user.display_name} rolled ${egg.name}`
        );

        console.log(
            `Owned: ${collectionEntry.quantity}`
        );


        sendEggRollToOverlay(
            user,
            egg,
            collectionEntry.quantity
        );

    } catch (error) {

        console.error(
            "Failed to handle EggGacha redemption:",
            error
        );

    }

}


// ======================================================
// Handle Twitch chat
// ======================================================

async function handleChatMessage(
    twitchSession,
    event
) {

    try {

        const text =
            event.message
                ?.text
                ?.trim()
                ?.toLowerCase();


        if (
            text !== "!eggs" &&
            text !== "!collection"
        ) {

            return;

        }


        console.log(
            `${event.chatter_user_name} used ${text}`
        );


        const user =
            getUserByTwitchId(
                event.chatter_user_id
            );


        // ==============================================
        // Viewer has no EggGacha collection yet
        // ==============================================

        if (!user) {

            await sendChatMessage(
                twitchSession,
                `@${event.chatter_user_name}, you don't have an EggGacha collection yet. Redeem the 🥚 Roll an Egg reward first!`
            );


            return;

        }


        // ==============================================
        // Build collection link
        // ==============================================

        const publicUrl =
            (
                process.env.PUBLIC_URL ??
                `http://localhost:${process.env.PORT || 3000}`
            )
                .replace(
                    /\/$/,
                    ""
                );


        const collectionUrl =
            `${publicUrl}/collection/${encodeURIComponent(user.display_name)}`;


        // ==============================================
        // Send collection
        // ==============================================

        await sendChatMessage(
            twitchSession,
            `@${event.chatter_user_name}, your EggGacha collection: ${collectionUrl}`
        );


        console.log(
            `Collection link sent to ${event.chatter_user_name}`
        );

    } catch (error) {

        console.error(
            "Failed to handle Twitch chat command:",
            error
        );

    }

}


// ======================================================
// Overlay page
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

        try {

            const viewer =
                req.params.viewer;


            let user;


            if (
                /^\d+$/.test(
                    viewer
                )
            ) {

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
                            "Collection not found."
                    });

            }


            const collection =
                getUserCollection(
                    user.id
                );


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
                collection.length;


            const totalAvailable =
                eggs.length;


            const completion =
                totalAvailable > 0
                    ? Math.round(
                        (
                            uniqueEggs /
                            totalAvailable
                        ) *
                        100
                    )
                    : 0;


            const eggCollection =
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
                                    ?.first_obtained_at ??
                                null

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

                    totalAvailable,

                    completion

                },

                eggs:
                    eggCollection

            });

        } catch (error) {

            console.error(
                "Failed to load collection:",
                error
            );


            res
                .status(500)
                .json({
                    error:
                        "Failed to load collection."
                });

        }

    }
);


// ======================================================
// Start EggGacha
// ======================================================

const PORT =
    process.env.PORT ||
    3000;


server.listen(
    PORT,
    () => {

        console.log("");
        console.log(
            "========================================"
        );

        console.log(
            "          EggGacha is running"
        );

        console.log(
            "========================================"
        );

        console.log("");

        console.log(
            `App: http://localhost:${PORT}/`
        );

        console.log(
            `Overlay: http://localhost:${PORT}/overlay`
        );

        console.log("");

        console.log(
            "Chat commands:"
        );

        console.log(
            "!eggs"
        );

        console.log(
            "!collection"
        );

        console.log("");

        console.log(
            "Open the app and connect your Twitch account."
        );

        console.log("");

    }
);