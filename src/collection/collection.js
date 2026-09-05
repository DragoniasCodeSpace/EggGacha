const titleElement =
    document.getElementById("title");

const totalEggsElement =
    document.getElementById("total-eggs");

const uniqueEggsElement =
    document.getElementById("unique-eggs");

const completionElement =
    document.getElementById("completion");

const progressTextElement =
    document.getElementById("progress-text");

const progressElement =
    document.getElementById("progress");

const raritySections =
    document.getElementById("rarity-sections");


const rarityOrder = [
    "common",
    "uncommon",
    "rare",
    "epic",
    "legendary",
    "exotic",
    "mythic",
    "ancient",
    "eternal"
];


loadCollection();


async function loadCollection() {

    const collectionToken =
        getCollectionToken();


    if (!collectionToken) {

        showError(
            "No collection token was provided."
        );

        return;

    }


    try {

        const response =
            await fetch(
                `/api/collection/${encodeURIComponent(collectionToken)}`
            );


        if (!response.ok) {

            throw new Error(
                "Collection could not be loaded."
            );

        }


        const data =
            await response.json();


        renderCollection(data);

    } catch (error) {

        console.error(error);


        showError(
            "Failed to load collection."
        );

    }

}


function getCollectionToken() {

    const parts =
        window.location.pathname
            .split("/")
            .filter(Boolean);


    return parts[
        parts.length - 1
    ];

}


function renderCollection(data) {

    /*
     * Main collection stats
     */

    titleElement.textContent =
        `🥚 ${data.user.displayName}'s Collection`;


    totalEggsElement.textContent =
        data.stats.totalEggs;


    uniqueEggsElement.textContent =
        `${data.stats.uniqueEggs} / ${data.stats.totalAvailable}`;


    completionElement.textContent =
        `${data.stats.completion}%`;


    progressTextElement.textContent =
        `${data.stats.uniqueEggs} / ${data.stats.totalAvailable}`;


    progressElement.style.width =
        `${data.stats.completion}%`;


    /*
     * Clear existing rarity sections.
     */

    raritySections.replaceChildren();


    /*
     * Build one section per rarity.
     */

    for (const rarity of rarityOrder) {

        const rarityEggs =
            data.eggs.filter(
                egg =>
                    egg.rarity === rarity
            );


        if (rarityEggs.length === 0) {
            continue;
        }


        const unlockedCount =
            rarityEggs.filter(
                egg =>
                    egg.unlocked
            ).length;


        const section =
            createRaritySection(
                rarity,
                rarityEggs,
                unlockedCount
            );


        raritySections.appendChild(
            section
        );

    }

}


function createRaritySection(
    rarity,
    eggs,
    unlockedCount
) {

    const section =
        document.createElement(
            "section"
        );


    section.classList.add(
        "rarity-section",
        `rarity-${rarity}`
    );


    /*
     * Rarity banner
     */

    const header =
        document.createElement(
            "div"
        );


    header.classList.add(
        "rarity-header"
    );


    /*
     * Rarity name
     */

    const title =
        document.createElement(
            "h2"
        );


    title.classList.add(
        "rarity-title"
    );


    title.textContent =
        rarity;


    /*
     * Rarity completion
     */

    const progress =
        document.createElement(
            "span"
        );


    progress.classList.add(
        "rarity-progress"
    );


    progress.textContent =
        `${unlockedCount} / ${eggs.length}`;


    /*
     * Egg grid
     */

    const grid =
        document.createElement(
            "div"
        );


    grid.classList.add(
        "egg-grid"
    );


    for (const egg of eggs) {

        const card =
            createEggCard(egg);


        grid.appendChild(
            card
        );

    }


    /*
     * Assemble section
     */

    header.appendChild(
        title
    );


    header.appendChild(
        progress
    );


    section.appendChild(
        header
    );


    section.appendChild(
        grid
    );


    return section;

}


function createEggCard(egg) {

    const card =
        document.createElement(
            "div"
        );


    card.classList.add(
        "egg-card"
    );


    if (egg.unlocked) {

        return createUnlockedEggCard(
            card,
            egg
        );

    }


    return createLockedEggCard(
        card,
        egg
    );

}


function createUnlockedEggCard(
    card,
    egg
) {

    card.classList.add(
        "unlocked",
        egg.rarity
    );


    /*
     * Image container
     */

    const imageContainer =
        document.createElement(
            "div"
        );


    imageContainer.classList.add(
        "egg-image-container"
    );


    /*
     * Egg image
     */

    const image =
        document.createElement(
            "img"
        );


    image.classList.add(
        "egg-image"
    );


    image.src =
        egg.image;


    image.alt =
        egg.name;


    /*
     * Quantity
     */

    const quantity =
        document.createElement(
            "div"
        );


    quantity.classList.add(
        "quantity"
    );


    quantity.textContent =
        `×${egg.quantity}`;


    /*
     * Egg name
     */

    const name =
        document.createElement(
            "div"
        );


    name.classList.add(
        "egg-name"
    );


    name.textContent =
        egg.name;


    /*
     * Egg rarity
     */

    const rarity =
        document.createElement(
            "div"
        );


    rarity.classList.add(
        "egg-rarity"
    );


    rarity.textContent =
        egg.rarity;


    /*
     * Assemble card
     */

    imageContainer.appendChild(
        image
    );


    imageContainer.appendChild(
        quantity
    );


    card.appendChild(
        imageContainer
    );


    card.appendChild(
        name
    );


    card.appendChild(
        rarity
    );


    return card;

}


function createLockedEggCard(
    card,
    egg
) {

    card.classList.add(
        "locked"
    );


    /*
     * Image container
     */

    const imageContainer =
        document.createElement(
            "div"
        );


    imageContainer.classList.add(
        "egg-image-container"
    );


    /*
     * Locked egg image
     */

    const image =
        document.createElement(
            "img"
        );


    image.classList.add(
        "egg-image",
        "locked-image"
    );


    image.src =
        egg.image;


    image.alt =
        "Locked egg";


    /*
     * Lock icon
     */

    const lock =
        document.createElement(
            "div"
        );


    lock.classList.add(
        "lock"
    );


    lock.textContent =
        "🔒";


    /*
     * Hidden egg name
     */

    const name =
        document.createElement(
            "div"
        );


    name.classList.add(
        "egg-name"
    );


    name.textContent =
        "???";


    /*
     * Hidden rarity
     */

    const rarity =
        document.createElement(
            "div"
        );


    rarity.classList.add(
        "egg-rarity"
    );


    rarity.textContent =
        "Unknown";


    /*
     * Assemble card
     */

    imageContainer.appendChild(
        image
    );


    imageContainer.appendChild(
        lock
    );


    card.appendChild(
        imageContainer
    );


    card.appendChild(
        name
    );


    card.appendChild(
        rarity
    );


    return card;

}


function showError(message) {

    raritySections.replaceChildren();


    const error =
        document.createElement(
            "p"
        );


    error.textContent =
        message;


    raritySections.appendChild(
        error
    );

}