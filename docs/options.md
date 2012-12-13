# cram.js Command Line Options

In an ideal situation, you can just point cram at your app's HTML page and cram will use [Code Inference](concepts.md#code-inference) to *do the right thing*.  However, some frameworks dynamically generate the HTML page, so that just won't work.  In other cases, cram.js may not properly infer your intentions.  For these cases, cram.js looks for several options on the command line.

```
node cram myapp.html
```

## Compile-time Overrides

There are a few AMD configuration options that don't make sense to the AMD loader.  These options may be placed into an `overrides.json` file.  This file doesn't have to be called "overrides.json", it can be called anything you like.  It can even be an AMD module with a ".js" extension.

```
node cram myapp.html production_build_options.json
```

