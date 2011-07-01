#!/bin/bash
# dependency collector
# input: module id, parent id
# output: dependency module ids separated by commas
# assumes $JSENGINE and $BINDIR are defined

#set -o xtrace

ESCAPER="$BINDIR"/jsescape.sh
RESOLVER="$JSDIR"/Resolver.js
PARSER="$JSDIR"/parser.js
RUNNER="$BINDIR"/jsrun.sh
COLLECTOR=$0
if [[ ! "$ENGINECAPS" =~ hasJson=true  ]]; then
	#rhino needs this, jsc does not
	JSON="$JSDIR"/json2.js
fi

# resolve module id to url

JSCMD="var resolver = new Resolver(\"$2\", $CONFIG); print(resolver.toUrl(\"$1\"));"
MODURL=$("$RUNNER" "$JSCMD" "$RESOLVER")

# Recursively print dependencies JSON
function printDeps() {
	local URL=$1
	
	# Only proceed if the file exists
	if [[ -f "$URL" ]]; then

		# Get the source
		local MODSRC=$("$ESCAPER" < "$URL")

		# find dependencies in this module
		local JSCMD="var resolver = new Resolver(\"$1\", $CONFIG); print(JSON.stringify(parser.parse(\"$MODSRC\").map(function (dep) { return resolver.toModuleInfo(dep); })));"
		local DEPS=$("$RUNNER" "$JSCMD" "$RESOLVER" "$PARSER" "$JSON")
		
		# If the JSON deps are non-empty, loop over them calling printDeps on each
		if [[ "$DEPS" != "[]" ]]; then
			# Print dependencies first, then the current module
			
			# Dependencies
			# HACK: Extract moduleUrl from JSON
			local LIST=$(echo $DEPS | sed -E 's/.*\"moduleUrl\"\:\"([^"]+)\".*/\1 /g')
			for nextDep in $LIST
			do
				printDeps "$nextDep"
			done
			
			# Current module
			echo -n $DEPS
		fi
		
	fi
}

printDeps "$MODURL"
exit 1