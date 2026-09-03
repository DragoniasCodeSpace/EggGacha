import express from "express";
import WebSocket from "ws";
import "dotenv/config";


// ======================================================
// CONFIG
// ======================================================

const app = express();

const clientId = process.env.TWITCH_CLIENT_ID;
const clientSecret = process.env.TWITCH_CLIENT_SECRET;
const redirectUri = process.env.TWITCH_REDIRECT_URI;

let accessToken = null;
let refreshToken = null;
let broadcasterId = null;


// ======================================================
// TWITCH LOGIN
// ======================================================

app.get("/", (req, res) => {
    res.send(`
        <h1>EggGacha</h1>
        <p>Connect EggGacha to your Twitch account.</p>

        <a href="/auth/twitch">
            Login with Twitch
        </a>
    `);
});


app.get("/auth/twitch", (req, res) => {

    const scopes = [
        "channel:read:redemptions"
    ];

    const authUrl =
        "https://id.twitch.tv/oauth2/authorize" +
        `?client_id=${encodeURIComponent(clientId)}` +
        `&redirect_uri=${encodeURIComponent(redirectUri)}` +
        `&response_type=code` +
        `&scope=${encodeURIComponent(scopes.join(" "))}`;

    res.redirect(authUrl);
});


// ======================================================
// TWITCH OAUTH CALLBACK
// ======================================================

app.get("/auth/twitch/callback", async (req, res) => {

    const code = req.query.code;

    if (!code) {
        return res
            .status(400)
            .send("No authorization code received.");
    }

    try {

        // ----------------------------------------------
        // Exchange authorization code for access token
        // ----------------------------------------------

        const tokenUrl = new URL(
            "https://id.twitch.tv/oauth2/token"
        );

        tokenUrl.searchParams.set(
            "client_id",
            clientId
        );

        tokenUrl.searchParams.set(
            "client_secret",
            clientSecret
        );

        tokenUrl.searchParams.set(
            "code",
            code
        );

        tokenUrl.searchParams.set(
            "grant_type",
            "authorization_code"
        );

        tokenUrl.searchParams.set(
            "redirect_uri",
            redirectUri
        );


        const tokenResponse = await fetch(
            tokenUrl,
            {
                method: "POST"
            }
        );

        const tokenData =
            await tokenResponse.json();


        if (!tokenResponse.ok) {

            console.error(
                "Failed to get Twitch token:",
                tokenData
            );

            return res
                .status(500)
                .send(
                    "Failed to get Twitch access token."
                );
        }


        accessToken =
            tokenData.access_token;

        refreshToken =
            tokenData.refresh_token;


        console.log("");
        console.log(
            "Twitch authentication successful!"
        );

        console.log(
            "Access token received ✓"
        );

        console.log(
            "Refresh token received ✓"
        );


        // ----------------------------------------------
        // Get logged-in Twitch user
        // ----------------------------------------------

        const userResponse = await fetch(
            "https://api.twitch.tv/helix/users",
            {
                headers: {

                    "Client-ID":
                        clientId,

                    "Authorization":
                        `Bearer ${accessToken}`
                }
            }
        );


        const userData =
            await userResponse.json();


        if (!userResponse.ok) {

            console.error(
                "Failed to get Twitch user:",
                userData
            );

            return res
                .status(500)
                .send(
                    "Failed to get Twitch user."
                );
        }


        const user =
            userData.data[0];


        broadcasterId =
            user.id;


        console.log(
            "Logged in as:",
            user.login
        );

        console.log(
            "Broadcaster ID:",
            broadcasterId
        );


        // ----------------------------------------------
        // Authentication is complete.
        // We can now connect to EventSub.
        // ----------------------------------------------

        connectToTwitchEventSub();


        res.send(`
            <h1>EggGacha connected!</h1>

            <p>
                Logged in as
                <strong>${user.display_name}</strong>
            </p>

            <p>
                EggGacha is now listening for
                Channel Point redemptions.
            </p>

            <p>
                You can close this page.
            </p>
        `);

    } catch (error) {

        console.error(
            "OAuth error:",
            error
        );

        res
            .status(500)
            .send(
                "Something went wrong during Twitch authentication."
            );
    }
});


// ======================================================
// CREATE EVENTSUB SUBSCRIPTION
// ======================================================

async function subscribeToChannelPointRedemptions(
    sessionId
) {

    console.log(
        "Subscribing to Channel Point redemptions..."
    );


    const response = await fetch(
        "https://api.twitch.tv/helix/eventsub/subscriptions",
        {
            method: "POST",

            headers: {

                "Client-ID":
                    clientId,

                "Authorization":
                    `Bearer ${accessToken}`,

                "Content-Type":
                    "application/json"
            },

            body: JSON.stringify({

                type:
                    "channel.channel_points_custom_reward_redemption.add",

                version:
                    "1",

                condition: {

                    broadcaster_user_id:
                        broadcasterId
                },

                transport: {

                    method:
                        "websocket",

                    session_id:
                        sessionId
                }
            })
        }
    );


    const data =
        await response.json();


    if (!response.ok) {

        console.error(
            "Failed to create EventSub subscription:"
        );

        console.error(data);

        return;
    }


    console.log(
        "Subscribed to Channel Point redemptions! ✓"
    );
}


// ======================================================
// TWITCH EVENTSUB WEBSOCKET
// ======================================================

function connectToTwitchEventSub() {

    console.log("");
    console.log(
        "Connecting to Twitch EventSub..."
    );


    const socket = new WebSocket(
        "wss://eventsub.wss.twitch.tv/ws"
    );


    socket.on("open", () => {

        console.log(
            "Connected to Twitch WebSocket! ✓"
        );
    });


    socket.on("message", async (data) => {

        const message =
            JSON.parse(
                data.toString()
            );


        const messageType =
            message.metadata.message_type;


        console.log(
            "Received:",
            messageType
        );


        // ----------------------------------------------
        // Twitch gives us our WebSocket session
        // ----------------------------------------------

        if (
            messageType ===
            "session_welcome"
        ) {

            const sessionId =
                message.payload.session.id;


            console.log(
                "Session ID:",
                sessionId
            );


            await subscribeToChannelPointRedemptions(
                sessionId
            );
        }


        // ----------------------------------------------
        // Channel Point redemption received
        // ----------------------------------------------

        if (
            messageType ===
            "notification"
        ) {

            const event =
                message.payload.event;


            console.log("");
            console.log(
                "🥚 CHANNEL POINT REDEMPTION!"
            );

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
        }


        // ----------------------------------------------
        // Twitch sends these periodically
        // ----------------------------------------------

        if (
            messageType ===
            "session_keepalive"
        ) {

            console.log(
                "Twitch connection is alive."
            );
        }
    });


    socket.on("error", (error) => {

        console.error(
            "WebSocket error:",
            error
        );
    });


    socket.on("close", () => {

        console.log(
            "Disconnected from Twitch."
        );
    });
}


// ======================================================
// START EGGS GACHA SERVER
// ======================================================

app.listen(3000, () => {

    console.log("");
    console.log("============================");
    console.log("       🥚 EggGacha");
    console.log("============================");
    console.log("");

    console.log(
        "Open http://localhost:3000"
    );

    console.log(
        "and log in with Twitch."
    );

    console.log("");
});