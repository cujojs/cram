# dependency collector
# input: module id, parent id
# output: dependency module ids separated by commas
# assumes $JSENGINE and $BINDIR are defined

#set -o xtrace

ESCAPER="$BINDIR"/jsescape.sh
RESOLVER="$JSDIR"/Resolver.js
PARSER="$JSDIR"/parser.js
RUNNER="$BINDIR"/jsrun.sh
if [[ ! "$ENGINECAPS" =~ hasJson=true  ]]; then
	#rhino needs this, jsc does not
	JSON="$JSDIR"/json2.js
fi

# resolve module id to url

JSCMD="var resolver = new Resolver(\"$2\", $CONFIG); print(resolver.toUrl(\"$1\"));"
MODURL=$("$RUNNER" "$JSCMD" "$RESOLVER")
MODSRC=$($ESCAPER < "$MODURL")

# find dependencies in this module

JSCMD="var resolver = new Resolver(\"$1\", $CONFIG); print(JSON.stringify(parser.parse(\"$MODSRC\").map(function (dep) { return resolver.toModuleInfo(dep); })));"
"$RUNNER" "$JSCMD" "$RESOLVER" "$PARSER" "$JSON"
