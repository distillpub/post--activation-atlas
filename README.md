If you want to cache the assets locally, for offline access, you need to run the caching script once, which will download *a lot* of images to the `_cache` directory.

```
python3 cache.py
```

To view the output you need a server:

```
npm run serve
```

Then visit [http://localhost:8000/public/](http://localhost:8000/public/) for the article or [http://localhost:8000/public/app.html](http://localhost:8000/public/app.html) for a full screen version of a single atlas.

If you need to edit the javascript code, run this watching compile server in a separate process: 

```
npm run watch
```

Then reload the browser anytime you want to see changes.
