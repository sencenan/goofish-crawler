chrome.runtime.onMessage.addListener(
    (request, sender, sendResponse) => {
        if (request.event !== 'popup-open') {
            return;
        }

        console.log("start parsing DOM");
        const listElem = Array.from(
            document.querySelector('#content div[class^="list--"]').children
        );

        const data = listElem.flatMap(
            it => {
                try { return parse(it); } catch(ex) { return []; }
            }
        );

        sendResponse(data);
    }
);

const parse = it => {
    if (!it.querySelector('[class^="container--"] [class^="name--"]')) {
        return [];
    }

    const seller = it.querySelector('[class^="container--"] [class^="name--"]').innerText
    const item = it.querySelector('[class^="main--"] [class^="name--"]').innerText;
    const image = it.querySelector('[class^="picture--"] img').src;
    const price = it.querySelector('[class^="price--"]').innerText;
    const status = it.querySelector('[class^="status--"]').innerText;
    const url = it.querySelector('[class^="status--"]').innerText;

    return [{
        seller, item, price, status, image, url
    }];
};
