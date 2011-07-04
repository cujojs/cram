#!/bin/bash
# dependency collector
# input: module id, parent id
# output: dependency module ids separated by commas
# assumes $CONFIG, $JSENGINE, and $BINDIR are defined

#set -o xtrace

ESCAPER="$BINDIR"/jsescape.sh
EXTRACTOR="$BINDIR"/getjsonstring.sh

RESOLVER="$JSDIR"/Resolver.js
ANALYZER="$JSDIR"/Analyzer.js
RUNNER="$BINDIR"/jsrun.sh
LOADER="$JSDIR"/SimpleAmdLoader.js
ANALYZE="$JSDIR"/analyze.js

COLLECTOR=$0
# resolve module id to url

JSCMD="var resolver = new Resolver(\"$2\", $CONFIG); print(resolver.toUrl(\"$1\"));"
MODURL=$("$RUNNER" "$JSCMD" "$RESOLVER")

# Recursively print dependencies JSON
function printDeps () {
	local MODID=$1
	local URL=$2
	local PARENTID=$3

	# Only proceed if the file exists
	if [[ -f "$URL" ]]; then

		# Get the source
		local MODSRC=$("$ESCAPER" < "$URL")

		# TODO: grab urls while gabbing ids rather than in the loop below
		# find dependencies in this module
		#local JSCMD="print(JSON.stringify(analyze(\"$MODSRC\", \"$PARENTID\", $CONFIG).map(function (def) { return def.id + '||' + def.url; })));"
		#local DEPS=$("$RUNNER" "$JSCMD" "$LOADER" "$RESOLVER" "$ANALYZER" "$JSON" "$ANALYZE")
		# format into a newline-delimited list (bash-friendly)
		local JSCMD="print(analyze(\"$MODSRC\", \"$PARENTID\", $CONFIG).join('\n'));"
		local DEPS=$("$RUNNER" "$JSCMD" "$LOADER" "$RESOLVER" "$ANALYZER" "$ANALYZE")
#echo "deps for $MODID = $DEPS"

		# If the JSON deps are non-empty, loop over them calling printDeps on each
		#if [[ "$DEPS" != "[]" ]]; then
		if [[ "$DEPS" != "" ]]; then
			# Print dependencies first, then the current module
			
			# Dependencies
			# HACK: Extract moduleUrl from JSON
			#local LIST=$(echo $DEPS | sed -E 's/.*"url"[^:]*\:[^"]*"([^"]+)".*/\1 /g')
			#local LIST=$(echo $DEPS | sed -E 's/.*\"url\"\:\"([^"]+)\".*/\1 /g')
			#local LIST=$(echo $DEPS | sed -E 's/(\[\s*)?\"([^"]+)\"(\s*(,|\])+)/\2 /g')
			#for nextDep in $LIST
			for nextDep in $DEPS
			do
				JSCMD="var resolver = new Resolver(\"$PARENTID\", $CONFIG); print(resolver.toUrl(\"$nextDep\"));"
				local CHILDURL=$("$RUNNER" "$JSCMD" "$RESOLVER")
				printDeps "$nextDep" "$CHILDURL" "$MODID"
			done
			
			# Current module, quoted and comma-delimited
			echo -n '"'$(echo "$DEPS" | sed -n -e '1h;1!H;${;g;s/\n/","/g;p;}')'",'
			#echo -n $DEPS
		fi
		
	fi
}

printDeps "$1" "$MODURL" "$2"
exit 1
