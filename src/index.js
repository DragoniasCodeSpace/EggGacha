import "dotenv/config";
import express from "express";

import { config } from "./config/config.js";

import { registerAuthRoutes } from "./twitch/auth.js";
import { connectToEventSub } from "./twitch/eventSub.js";
import { getOrCreateEggReward } from "./twitch/api.js";

import { rollEgg } from "./gacha/rollEgg.js";

import { getOrCreateUser } from "./database/users.js";
import { addEggToCollection } from "./database/collections.js";

const app = express();

let eventSubSocket = null;
let eggRewardId = null;

console.log("");
console.log("=======================");
console.log("      🥚 EggGacha");
console.log("=======================");
console.log("");

registerAuthRoutes(app, async (twitchSession) => {
    console.log(
        `Twitch connected: ${twitchSession.broadcaster.displayName}`
    );

    const eggReward = await getOrCreateEggReward(
        twitchSession
    );

    eggRewardId = eggReward.id;

    console.log(
        `Listening for EggGacha reward: ${eggReward.title}`
    );

    if (eventSubSocket) {
        eventSubSocket.close();
    }

    eventSubSocket = connectToEventSub(
        twitchSession,
        handleRedemption
    );
});


async function handleRedemption(event) {
    // Ignore every Channel Point reward
    // except EggGacha's reward.
    if (event.reward.id !== eggRewardId) {
        return;
    }

    // Roll the egg.
    const egg = rollEgg();

    // Find the Twitch viewer in the database,
    // or create them if this is their first roll.
    const user = getOrCreateUser(
        event.user_id,
        event.user_name
    );

    // Add the egg to their collection.
    // If they already own it, quantity increases by 1.
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

    // Later:
    // send result to OBS overlay
    // send result to chat
}


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