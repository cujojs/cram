# cram.js Command Line Options

cram.js has three modes of command-line operation:

1. HTML auto-configuration via [Code Inference](concepts.md#code-inference)
1. run.js auto-configuration via [Code Inference](concepts.md#code-inference)
1. Manual configuration

## HTML auto-configuration

If your server-side environment allows you to place your HTML documents in a
static location, you may be able to use Code Inference on your HTML file(s)
directly.  In its simplest form, the command line looks like this:

```
node cram client/myapp.html
```

## run.js auto-configuration

If your app's HTML documents are generated dynamically and don't exist at
development time, you can still take advantage of some of cram.js's Code
Inference features.  Point cram at a ["run.js" file](concepts.md#run-js)
and tell cram where to find the app's modules using the `--root`
[command line option](#manual-configuration).

```
node cram client/myapp/run.js --root client/myapp/
```

## Compile-time Overrides

However, in most situations, you'll want to specify some configuration options
that don't apply to the run-time operation of your application.  These
"compile-time" overrides should be placed in a separate file from your
run-time files.

Here's how you specify an additional overrides file:

```
node cram client/myapp.html production_build_options.json
```

This is simply a shortcut for the following, more explicit way to specify a
configuration file:

```
node cram client/myapp.html --config production_build_options.json
```

## Manual configuration

In some cases, cram.js may not properly infer your intentions.  Also, for
advanced applications, you'll need fine-grained control over what cram.js does.
For both of these situations, cram.js looks for a few other options on the
command line.

cram.js supports the following command-line arguments.  In cases where these
conflict with configuration options, the command-line arguments take
precedence.

```
	-? -h --help
		provides this help message.
	-m --main --include
		includes the following file into the bundle.
		You may specify more than one by repeating this option.
	-r --root --moduleRoot
		specifies the path from the current working directory to
		the location of your packages.  This serves the same
		purpose as (and overrides) baseUrl.
	-c --config
		specifies an AMD configuration file.
		You may specify more than one by repeating this option.
	--loader -l
		tells cram to include the following file as an AMD loader.
	-o --output
		specifies the output file for the generated bundle(s).
		the folder must already exist.
```
