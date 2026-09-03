import "dotenv/config";
import express from "express";

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


const app = express();

let eventSubSocket = null;
let eggRewardId = null;


console.log("");
console.log("=======================");
console.log("      🥚 EggGacha");
console.log("=======================");
console.log("");


// Twitch authentication
registerAuthRoutes(app, async (twitchSession) => {
    console.log(
        `Twitch connected: ${twitchSession.broadcaster.displayName}`
    );

    // Find EggGacha's reward or create it if it doesn't exist.
    const eggReward = await getOrCreateEggReward(
        twitchSession
    );

    eggRewardId = eggReward.id;

    console.log(
        `Listening for EggGacha reward: ${eggReward.title}`
    );

    // Prevent multiple EventSub connections.
    if (eventSubSocket) {
        eventSubSocket.close();
    }

    eventSubSocket = connectToEventSub(
        twitchSession,
        handleRedemption
    );
});


// Handle Channel Point redemption
async function handleRedemption(event) {

    // Ignore every reward except EggGacha's reward.
    if (event.reward.id !== eggRewardId) {
        return;
    }

    // Roll an egg.
    const egg = rollEgg();

    // Find the viewer or create them.
    const user = getOrCreateUser(
        event.user_id,
        event.user_name
    );

    // Add the rolled egg to their collection.
    const collectionEntry = addEggToCollection(
        user.id,
        egg.id
    );

    console.log("");
    console.log("🥚 Egg rolled!");
    console.log("Viewer:", user.display_name);
    console.log("Viewer ID:", event.user_id);
    console.log("Egg:", egg.name);
    console.log("Rarity:", egg.rarity);
    console.log("Owned:", collectionEntry.quantity);
    console.log("");
}


// Collection page
app.get(
    "/collection/:twitchUserId",
    (req, res) => {

        const twitchUserId =
            req.params.twitchUserId;

        const user = getUserByTwitchId(
            twitchUserId
        );

        if (!user) {
            return res
                .status(404)
                .send("Viewer not found.");
        }

        const collection = getUserCollection(
            user.id
        );

        const totalEggs = collection.reduce(
            (total, entry) =>
                total + entry.quantity,
            0
        );

        const uniqueEggs = collection.length;

        const eggsHtml = collection
            .filter(entry => entry.egg)
            .map(entry => `
                <li>
                    <strong>
                        ${entry.egg.name}
                    </strong>

                    (${entry.egg.rarity})

                    ×${entry.quantity}
                </li>
            `)
            .join("");

        res.send(`
            <!DOCTYPE html>

            <html>
                <head>
                    <meta charset="UTF-8">

                    <title>
                        ${user.display_name}'s Egg Collection
                    </title>
                </head>

                <body>

                    <h1>
                        🥚 ${user.display_name}'s Egg Collection
                    </h1>

                    <p>
                        Total Eggs:
                        <strong>${totalEggs}</strong>
                    </p>

                    <p>
                        Unique Eggs:
                        <strong>
                            ${uniqueEggs} / ${eggs.length}
                        </strong>
                    </p>

                    <hr>

                    <ul>
                        ${eggsHtml}
                    </ul>

                </body>
            </html>
        `);
    }
);


// Start EggGacha
app.listen(
    config.server.port,
    () => {

        console.log(
            `EggGacha running on http://localhost:${config.server.port}`
        );

        console.log(
            "Login with Twitch to start."
        );

        console.log("");
    }
);