export class OverlayDurableObject {

    constructor(
        ctx,
        env
    ) {

        this.ctx =
            ctx;

        this.env =
            env;

    }


    // ==================================================
    // Requests
    // ==================================================

    async fetch(
        request
    ) {

        const url =
            new URL(
                request.url
            );


        // ==============================================
        // Broadcast egg roll
        // ==============================================

        if (
            request.method === "POST" &&
            url.pathname === "/broadcast"
        ) {

            return await this.handleBroadcast(
                request
            );

        }


        // ==============================================
        // WebSocket connection
        // ==============================================

        const upgradeHeader =
            request.headers.get(
                "Upgrade"
            );


        if (
            upgradeHeader?.toLowerCase() ===
            "websocket"
        ) {

            return this.handleWebSocket();

        }


        return new Response(
            "Not Found",
            {
                status:
                    404
            }
        );

    }


    // ==================================================
    // WebSocket
    // ==================================================

    handleWebSocket() {

        const pair =
            new WebSocketPair();


        const client =
            pair[0];


        const server =
            pair[1];


        this.ctx.acceptWebSocket(
            server
        );


        console.log(
            "Overlay client connected"
        );


        return new Response(
            null,
            {
                status:
                    101,

                webSocket:
                    client
            }
        );

    }


    // ==================================================
    // Broadcast request
    // ==================================================

    async handleBroadcast(
        request
    ) {

        let data;


        try {

            data =
                await request.json();

        } catch {

            return new Response(
                "Invalid JSON",
                {
                    status:
                        400
                }
            );

        }


        if (
            !data?.user?.displayName ||
            !data?.egg?.id ||
            !data?.egg?.name ||
            !data?.egg?.rarity
        ) {

            return new Response(
                "Invalid egg roll payload",
                {
                    status:
                        400
                }
            );

        }


        this.broadcastEggRoll(
            data
        );


        return new Response(
            null,
            {
                status:
                    204
            }
        );

    }


    // ==================================================
    // Broadcast egg roll
    // ==================================================

    broadcastEggRoll(
        data
    ) {

        const quantity =
            Number(
                data.collection?.quantity ??
                1
            );


        const message =
            JSON.stringify({

                type:
                    "egg_roll",

                user: {

                    displayName:
                        data.user.displayName

                },

                egg: {

                    id:
                        data.egg.id,

                    name:
                        data.egg.name,

                    rarity:
                        data.egg.rarity,

                    image:
                        data.egg.image ?? null

                },

                collection: {

                    quantity,

                    isNew:
                        quantity === 1

                }

            });


        const sockets =
            this.ctx.getWebSockets();


        let sentTo =
            0;


        for (
            const socket
            of sockets
        ) {

            try {

                socket.send(
                    message
                );


                sentTo++;

            } catch (error) {

                console.error(
                    "Failed to send overlay message:",
                    error
                );

            }

        }


        console.log(
            `Egg roll sent to ${sentTo} overlay client(s).`
        );

    }


    // ==================================================
    // WebSocket close
    // ==================================================

    webSocketClose(
        webSocket,
        code,
        reason,
        wasClean
    ) {

        console.log(
            `Overlay client disconnected: ${code} ${reason ?? ""}`
        );

    }


    // ==================================================
    // WebSocket error
    // ==================================================

    webSocketError(
        webSocket,
        error
    ) {

        console.error(
            "Overlay WebSocket error:",
            error
        );

    }

}