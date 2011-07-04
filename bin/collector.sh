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
if [[ ! "$ENGINECAPS" =~ hasJson=true  ]]; then
	#rhino needs this, jsc does not
	JSON="$JSDIR"/json2.js
fi

# resolve module id to url

JSCMD="var resolver = new Resolver(\"$2\", $CONFIG); print(resolver.toUrl(\"$1\"));"
MODURL=$("$RUNNER" "$JSCMD" "$RESOLVER")

# Recursively print dependencies JSON
function printDeps () {
	local URL=$1
	local PARENTID=$2

	# Only proceed if the file exists
	if [[ -f "$URL" ]]; then

		# Get the source
		local MODSRC=$("$ESCAPER" < "$URL")

		# find dependencies in this module
#		local JSCMD="var resolver = new Resolver(\"$1\", $CONFIG), analyzer = new Analyzer(); print(JSON.stringify(analyzer.parse(\"$MODSRC\").map(function (dep) { return resolver.toModuleInfo(dep); })));"
		local JSCMD="print(JSON.stringify(analyze(\"$MODSRC\", \"$PARENTID\", $CONFIG)));"
		local DEPS=$("$RUNNER" "$JSCMD" "$LOADER" "$RESOLVER" "$ANALYZER" "$JSON" "$ANALYZE")

		# If the JSON deps are non-empty, loop over them calling printDeps on each
		if [[ "$DEPS" != "[]" ]]; then
			# Print dependencies first, then the current module
			
			# Dependencies
			#local LIST=$("$EXTRACTOR" -f 'g' "$DEPS")
			# HACK: Extract moduleUrl from JSON
			local LIST=$(echo $DEPS | sed -E 's/.*"url"[^:]*\:[^"]*"([^"]+)".*/\1 /g')
			for nextDep in $LIST
			do
				printDeps "$nextDep" "$PARENTID"
			done
			
			# Current module
			echo -n $DEPS
		fi
		
	fi
}

printDeps "$MODURL" "$2"
exit 1
