import crypto from "crypto";
import path from "path";
import { fileURLToPath } from "url";

import { config } from "../config/config.js";
import { getTwitchUser } from "./api.js";
import { saveTwitchSession } from "./session.js";


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
// OAuth states
// ======================================================
//
// Stores temporary OAuth state values so we can verify
// that Twitch callbacks belong to login requests that
// originated from EggGacha.
//

const validStates =
    new Set();


// ======================================================
// Register authentication routes
// ======================================================

export function registerAuthRoutes(
    app,
    onAuthenticated
) {

    // ==================================================
    // EggGacha home / login page
    // ==================================================

    app.get(
        "/",
        (req, res) => {

            res.sendFile(
                path.join(
                    __dirname,
                    "..",
                    "auth",
                    "login.html"
                )
            );

        }
    );


    // ==================================================
    // Start Twitch authentication
    // ==================================================

    app.get(
        "/auth/twitch",
        (req, res) => {

            // Generate a random state value.
            // This protects the OAuth flow against CSRF.

            const state =
                crypto
                    .randomBytes(24)
                    .toString("hex");


            validStates.add(
                state
            );


            // Build Twitch authorization URL.

            const authUrl =
                new URL(
                    "https://id.twitch.tv/oauth2/authorize"
                );


            authUrl.searchParams.set(
                "client_id",
                config.twitch.clientId
            );


            authUrl.searchParams.set(
                "redirect_uri",
                config.twitch.redirectUri
            );


            authUrl.searchParams.set(
                "response_type",
                "code"
            );


            authUrl.searchParams.set(
                "scope",
                [
                    "channel:manage:redemptions",
                    "user:read:chat",
                    "user:write:chat"
                ].join(" ")
            );


            authUrl.searchParams.set(
                "state",
                state
            );


            // Send the user to Twitch.

            res.redirect(
                authUrl.toString()
            );

        }
    );


    // ==================================================
    // Twitch OAuth callback
    // ==================================================

    app.get(
        "/auth/twitch/callback",
        async (req, res) => {

            const {
                code,
                state,
                error,
                error_description
            } = req.query;


            // ==========================================
            // Twitch returned an OAuth error
            // ==========================================

            if (error) {

                console.error(
                    "Twitch authentication failed:",
                    error_description ?? error
                );


                return res
                    .status(400)
                    .send(
                        "Twitch authentication was cancelled or failed."
                    );

            }


            // ==========================================
            // Validate OAuth state
            // ==========================================

            if (
                !state ||
                !validStates.has(state)
            ) {

                console.error(
                    "Invalid Twitch OAuth state."
                );


                return res
                    .status(400)
                    .send(
                        "Invalid Twitch authentication state."
                    );

            }


            // State can only be used once.

            validStates.delete(
                state
            );


            // ==========================================
            // Make sure Twitch returned a code
            // ==========================================

            if (!code) {

                return res
                    .status(400)
                    .send(
                        "No Twitch authorization code was returned."
                    );

            }


            try {

                // ======================================
                // Exchange authorization code for token
                // ======================================

                const tokenUrl =
                    new URL(
                        "https://id.twitch.tv/oauth2/token"
                    );


                tokenUrl.searchParams.set(
                    "client_id",
                    config.twitch.clientId
                );


                tokenUrl.searchParams.set(
                    "client_secret",
                    config.twitch.clientSecret
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
                    config.twitch.redirectUri
                );


                const tokenResponse =
                    await fetch(
                        tokenUrl,
                        {
                            method: "POST"
                        }
                    );


                const tokenData =
                    await tokenResponse.json();


                if (!tokenResponse.ok) {

                    throw new Error(
                        `Failed to get Twitch token: ${JSON.stringify(tokenData)}`
                    );

                }


                // ======================================
                // Get authenticated Twitch account
                // ======================================

                const twitchUser =
                    await getTwitchUser(
                        tokenData.access_token
                    );


                // ======================================
                // Build EggGacha Twitch session
                // ======================================

                const twitchSession = {

                    accessToken:
                        tokenData.access_token,

                    refreshToken:
                        tokenData.refresh_token,

                    broadcaster: {

                        id:
                            twitchUser.id,

                        login:
                            twitchUser.login,

                        displayName:
                            twitchUser.display_name

                    }

                };


                saveTwitchSession(
                    twitchSession
                );


                console.log(
                    "Twitch OAuth successful."
                );


                console.log(
                    `Connected account: ${twitchSession.broadcaster.displayName}`
                );


                // ======================================
                // Notify EggGacha
                // ======================================
                //
                // index.js uses this to:
                //
                // - create/find the EggGacha reward
                // - connect EventSub
                // - start listening for redemptions
                //

                await onAuthenticated(
                    twitchSession
                );


                // ======================================
                // Redirect to connected UI
                // ======================================

                const params =
                    new URLSearchParams({
                        connected:
                            "true",

                        username:
                            twitchSession
                                .broadcaster
                                .displayName
                    });


                res.redirect(
                    `/?${params.toString()}`
                );

            } catch (error) {

                console.error(
                    "Twitch authentication error:",
                    error
                );


                res
                    .status(500)
                    .send(
                        "Failed to connect EggGacha to Twitch."
                    );

            }

        }
    );

}