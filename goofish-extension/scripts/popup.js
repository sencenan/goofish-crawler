chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
    chrome.tabs.sendMessage(
        tabs[0].id,
        {
            event: "popup-open"
        },
        function(response){
            const container = document.getElementById("content");

            // to CSV

            let csv = [];
            
            // headers
            csv.push(
                'Seller,Item,Price,Status,Image'
            );

            response.forEach(it => {
                const line = [it.seller, it.item, it.price, it.status, it.image]
                    .map(escapeCSV)
                    .join(',');

                csv.push(line);
            });

            navigator.clipboard.writeText(csv.join('\n'));

            container.innerText = 'Copied!'
        }
    );
});

const escapeCSV = (text) => {
    if (text.indexOf('"') > 0) {
        text = text.replaceAll('"', '"""');
    }
    return '"' + text + '"';
};
