import "dotenv/config";
import express from "express";

import { config } from "./config/config.js";
import { registerAuthRoutes } from "./twitch/auth.js";
import { connectToEventSub } from "./twitch/eventSub.js";


const app = express();

let eventSubSocket = null;


console.log("");
console.log("=======================");
console.log("      🥚 EggGacha");
console.log("=======================");
console.log("");


// Register Twitch OAuth routes
registerAuthRoutes(
    app,

    async (twitchSession) => {

        console.log(
            `Twitch connected: ${twitchSession.broadcaster.displayName}`
        );

        // Prevent multiple WebSocket connections
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


// This is where Twitch hands the redemption
// over to the rest of EggGacha.

async function handleRedemption(event) {
    console.log("");
    console.log("Redemption:");
    console.log(
        "Viewer:",
        event.user_name
    );

    console.log(
        "Viewer ID:",
        event.user_id
    );

    console.log(
        "Reward:",
        event.reward.title
    );

    console.log(
        "Reward ID:",
        event.reward.id
    );

    console.log(
        "Cost:",
        event.reward.cost
    );

    console.log("");

    // Later:
    //
    // await gacha.handleRedemption(event);
}


// Start web server

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