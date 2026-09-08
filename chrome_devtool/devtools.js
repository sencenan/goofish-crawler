const install = async () => {
  let panelPort = null;

  // Listen for the connection coming from panel.js
  chrome.runtime.onConnect.addListener((port) => {
    if (port.name === "goofish-ext") {
      panelPort = port;

      // Optional: handle cleanup when panel closes
      panelPort.onDisconnect.addListener(() => {
        panelPort = null;
      });
    }
  });

  const panel = await chrome.devtools.panels.create(
    "Goofish Data Exporter",
    "icon.png",
    "panel.html"
  );

  chrome.devtools.network.onRequestFinished.addListener(
    async (request) => {
      const url = request?.request?.url;

      if (!url || url && url.indexOf('mtop.idle.web.trade.bought.list') === -1) {
          return;
      }

      request.getContent((content, encoding) => {
        try {
          const itemIds = JSON.parse(content)?.data?.items?.map(x=>x.commonData.itemId) ?? []

          panelPort?.postMessage({
            type: "mtop.idle.web.trade.bought.list",
            url,
            itemIds
          });
        } catch (ex) {
          console.error(ex);
        }
      });
    }
  );
};

chrome.devtools.inspectedWindow.eval("window.location.href", async function(result, isException) {
  if (!isException && result) {
    // Check if the current domain matches your target domain
    if (result.includes('goofish.com/bought')) {
      await install();
    }
  }
});
