export const config = {

    // ==================================================
    // Server
    // ==================================================

    server: {

        port:
            Number(
                process.env.PORT ?? 3000
            ),

        publicUrl:
            process.env.PUBLIC_URL ??
            "http://localhost:3000"

    },


    // ==================================================
    // Twitch
    // ==================================================

    twitch: {

        clientId:
            process.env.TWITCH_CLIENT_ID,

        clientSecret:
            process.env.TWITCH_CLIENT_SECRET,

        redirectUri:
            process.env.TWITCH_REDIRECT_URI,


        // ==============================================
        // EggGacha Channel Point reward
        // ==============================================

        reward: {

            title:
                process.env.EGG_REWARD_TITLE ??
                "🥚 Roll an Egg",

            cost:
                Number(
                    process.env.EGG_REWARD_COST ??
                    100
                )

        },


        // ==============================================
        // Chat commands
        // ==============================================

        commands: {

            collection: [
                "!eggs",
                "!collection"
            ]

        }

    }

};