cram
===

cujo resource assembler

version 0.2

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
