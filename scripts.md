- get HAR from browser
    - filter "mtop.idle.web.trade.bought.list"
- save data as DATA, and run script to get item ids
```js
DATA.log.entries.filter(it => it.response.status == 200 && it.request.url.indexOf("mtop.idle.web.trade.bought.list") >= 0).map(it => JSON.parse(it.response.content.text)).flatMap(it => it.data.items).map(x=>x.commonData.itemId)
```

## Steps to run

1. open terminal
2. input `cd ~/ws/goofish-crawler` enter
3. input `node index.js` enter
4. to cancel the run, press CTRL + C

## Steps to add new

1. edit `item.json`
2. prepend item id to that list following the existinf format
    - "" around the id
    - , between the ids
    - id can be found from the url of the item on goofish   
        e.g. for: https://www.goofish.com/item?spm=a21ybx.personal.feeds.22.34886ac2BQ0ntb&id=1019737004392&categoryId=50023914
        the id is "1019737004392"
3. use the "Steps to run" to run

## download a single url on demand 

1. open terminal
2. input `cd ~/ws/goofish-crawler` enter
3. input `node index.js '<URL>'` enter

## need to login to download large amount of ids
