import { config } from "../config/config.js";
import { getTwitchUser } from "./api.js";

export function registerAuthRoutes(app, onAuthenticated) {
    app.get("/", (req, res) => {
        res.send(`
            <h1>EggGacha</h1>
            <p>Connect EggGacha to Twitch.</p>
            <a href="/auth/twitch">Login with Twitch</a>
        `);
    });

    app.get("/auth/twitch", (req, res) => {
        const scopes = [
            "channel:manage:redemptions"
        ];

        const authUrl =
            "https://id.twitch.tv/oauth2/authorize" +
            `?client_id=${encodeURIComponent(config.twitch.clientId)}` +
            `&redirect_uri=${encodeURIComponent(config.twitch.redirectUri)}` +
            `&response_type=code` +
            `&scope=${encodeURIComponent(scopes.join(" "))}`;

        res.redirect(authUrl);
    });

    app.get("/auth/twitch/callback", async (req, res) => {
        const code = req.query.code;

        if (!code) {
            return res
                .status(400)
                .send("No authorization code received.");
        }

        try {
            const tokenUrl = new URL(
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
                        "Failed to authenticate with Twitch."
                    );
            }

            const user = await getTwitchUser(
                tokenData.access_token
            );

            const session = {
                accessToken:
                    tokenData.access_token,

                refreshToken:
                    tokenData.refresh_token,

                broadcaster: {
                    id: user.id,
                    login: user.login,
                    displayName:
                        user.display_name
                }
            };

            console.log(
                `Authenticated as ${session.broadcaster.displayName}`
            );

            await onAuthenticated(session);

            res.send(`
                <h1>EggGacha connected!</h1>
                <p>
                    Logged in as
                    <strong>${session.broadcaster.displayName}</strong>
                </p>
                <p>You can close this page.</p>
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
}