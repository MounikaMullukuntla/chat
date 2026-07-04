# Knowledge Embed Sample

This page demonstrates embedding a working ModelEarth project — the [US State Trade Flow Map](https://model.earth/profile/trade/map/state.html) from the `profile` repo — into another repo by loading a single script:

```html
<script src="https://cdn.jsdelivr.net/gh/ModelEarth/localsite@main/js/trade.js?autoload=1"></script>
```

The `?autoload=1` parameter tells [`js/trade.js`](https://github.com/ModelEarth/localsite/blob/main/js/trade.js) that it's the only include on the page, so it dynamically loads everything else the map needs — `base.css`, `localsite.js`, Leaflet, D3, topojson, echarts, and the state trade dataset script — before the page's own map logic runs. Pages like `state.html` that already list those dependencies in their `<head>` don't set the parameter, so `trade.js` skips the extra loading and behaves exactly as before.
