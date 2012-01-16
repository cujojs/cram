cram
===

cujo resource assembler

version 0.6

Please Note: this project has moved from unscriptable/cram to cujojs/cram.
Any existing forks have been automatically moved to cujojs/cram. However,
you will need to update your clone and submodule remotes manually.

Update the url in your .git/config, and also .gitmodules for submodules:
	git://github.com/cujojs/cram.git
	https://cujojs@github.com/cujojs/cram.git

Helpful link for updating submodules:
[Git Submodules: Adding, Using, Removing, Updating](http://chrisjean.com/2009/04/20/git-submodules-adding-using-removing-and-updating/)

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
