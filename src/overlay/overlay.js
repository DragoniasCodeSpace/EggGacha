import { WebSocketServer, WebSocket } from "ws";

let overlayWss = null;

export function startOverlayServer(server) {

    overlayWss = new WebSocketServer({
        server,
        path: "/overlay-ws"
    });

    overlayWss.on(
        "connection",
        socket => {

            console.log("Overlay client connected ✓");

            socket.on(
                "close",
                () => {
                    console.log("Overlay client disconnected");
                }
            );

            socket.on(
                "error",
                error => {
                    console.error(
                        "Overlay WebSocket error:",
                        error
                    );
                }
            );

        }
    );

    console.log(
        "Overlay WebSocket ready at /overlay-ws ✓"
    );
}


export function sendEggRollToOverlay(
    user,
    egg,
    quantity
) {

    if (!overlayWss) {
        console.warn(
            "Overlay WebSocket server has not been started."
        );

        return;
    }

    const message = JSON.stringify({
        type: "egg_roll",

        user: {
            id: user.twitch_user_id,
            displayName: user.display_name
        },

        egg: {
            id: egg.id,
            name: egg.name,
            rarity: egg.rarity,
            image: egg.image ?? null
        },

        collection: {
            quantity,
            isNew: quantity === 1
        }
    });


    let sentTo = 0;


    for (const client of overlayWss.clients) {

        if (
            client.readyState ===
            WebSocket.OPEN
        ) {

            client.send(
                message
            );

            sentTo++;

        }

    }


    console.log(
        `Egg roll sent to ${sentTo} overlay client(s).`
    );
}