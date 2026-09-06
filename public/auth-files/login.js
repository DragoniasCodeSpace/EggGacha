const params =
    new URLSearchParams(
        window.location.search
    );


const connected =
    params.get(
        "connected"
    );


const username =
    params.get(
        "username"
    );


const collectionToken =
    params.get(
        "collectionToken"
    );


const loginState =
    document.getElementById(
        "login-state"
    );


const connectedState =
    document.getElementById(
        "connected-state"
    );


const subtitle =
    document.getElementById(
        "subtitle"
    );


const connectedUsername =
    document.getElementById(
        "connected-username"
    );


const collectionLink =
    document.getElementById(
        "collection-link"
    );


if (
    connected === "true" &&
    username
) {

    loginState.style.display =
        "none";


    connectedState.style.display =
        "flex";


    subtitle.textContent =
        "Your Twitch channel is connected to EggGacha.";


    connectedUsername.textContent =
        username;


    if (collectionToken) {

        collectionLink.href =
            `/collection/${encodeURIComponent(collectionToken)}`;

    } else {

        collectionLink.style.display =
            "none";

    }

}