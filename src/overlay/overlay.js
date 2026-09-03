import { WebSocketServer } from "ws";

let overlayClients = [];

export function startOverlayServer(server) {
    const wss = new WebSocketServer({
        server,
        path: "/overlay-ws"
    });

    wss.on("connection", (socket) => {
        console.log("OBS overlay connected ✓");

        overlayClients.push(socket);

        socket.on("close", () => {
            overlayClients = overlayClients.filter(
                client => client !== socket
            );

            console.log("OBS overlay disconnected.");
        });
    });

    return wss;
}

export function sendEggRollToOverlay(
    user,
    egg,
    quantity
) {
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

    for (const client of overlayClients) {
        if (client.readyState === client.OPEN) {
            client.send(message);
        }
    }
}