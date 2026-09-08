const itemIds = new Set();

const output = document.getElementById('output');

const port = chrome.runtime.connect({ name: "goofish-ext" });

// Listen for incoming data
port.onMessage.addListener((message) => {
  let newItemids = message.itemIds ?? [];
  newItemids.forEach(it => itemIds.add(it));

  const list = [...itemIds];

  output.innerText = JSON.stringify(list, ' ', 2);
});

const copyButton = document.getElementById('copy-button');
copyButton.addEventListener('click', async () => {
  try {
    // Use the modern Clipboard API
    await navigator.clipboard.writeText(output.innerText);
  } catch (err) {
    console.error('Failed to copy text: ', err);
  }
});
