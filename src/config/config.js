export const config = {
    twitch: {
        clientId: process.env.TWITCH_CLIENT_ID,
        clientSecret: process.env.TWITCH_CLIENT_SECRET,
        redirectUri: process.env.TWITCH_REDIRECT_URI
    },

    server: {
        port: Number(process.env.PORT ?? 3000)
    }
};