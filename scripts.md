- get HAR from browser
- save data as DATA, and run script to get item ids
```js
DATA.log.entries.filter(it => it.response.status == 200 && it.request.url.indexOf("mtop.idle.web.trade.bought.list") >= 0).map(it => JSON.parse(it.response.content.text)).flatMap(it => it.data.items).map(x=>x.commonData.itemId)
```