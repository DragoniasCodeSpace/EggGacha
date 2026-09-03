import "dotenv/config";
import express from "express";

import { config } from "./config/config.js";
import { registerAuthRoutes } from "./twitch/auth.js";
import { connectToEventSub } from "./twitch/eventSub.js";
import { rollEgg } from "./gacha/rollEgg.js";

const app = express();

let eventSubSocket = null;

console.log("");
console.log("=======================");
console.log("      🥚 EggGacha");
console.log("=======================");
console.log("");

registerAuthRoutes(app, async (twitchSession) => {
    console.log(
        `Twitch connected: ${twitchSession.broadcaster.displayName}`
    );

    // Prevent multiple EventSub connections
    if (eventSubSocket) {
        eventSubSocket.close();
    }

    eventSubSocket = connectToEventSub(
        twitchSession,
        handleRedemption
    );
});

async function handleRedemption(event) {
    const egg = rollEgg();

    console.log("");
    console.log("🥚 Egg rolled!");
    console.log("Viewer:", event.user_name);
    console.log("Viewer ID:", event.user_id);
    console.log("Reward:", event.reward.title);
    console.log("Egg:", egg.name);
    console.log("Rarity:", egg.rarity);
    console.log("");

    // Later:
    // save egg to viewer collection
    // send result to OBS overlay
}

app.listen(config.server.port, () => {
    console.log(
        `EggGacha running on http://localhost:${config.server.port}`
    );

    console.log("Login with Twitch to start.");
    console.log("");
});