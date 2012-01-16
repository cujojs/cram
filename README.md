cram
===

cujo resource assembler

version 0.6

Please Note: this project has moved from unscriptable/cram to cujojs/cram.
Any existing forks have been automatically moved to cujojs/cram. However,
your local clones and submodules will need to have their remote
submodule refs updated.  Remotes for clones can be updated by editing the url
in your .git/config files.

git://github.com/cujojs/cram.git
https://unscriptable@github.com/cujojs/cram.git

to use
---

rhino -O -1 bin/../js/cram.js --root "js/tiny" --config test/tinycfg.json

command line options
---

--help: shows all command line options and shortcuts
--root: root module of your app
--config: configuration json file
--baseurl: folder at top level of application
--src: path to cram src folder (needed by some js engines)
--output: path to output file if not specified in config.json
