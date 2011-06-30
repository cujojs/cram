# dependency collector
# input: module id, parent id
# output: dependency module ids separated by commas
# assumes $JSENGINE and $BINDIR are defined

#set -o xtrace

ESCAPER="$BINDIR"/jsescape.sh
RESOLVER="$BINDIR"/../js/Resolver.js
PARSER="$BINDIR"/../js/parser.js
JSON="$BINDIR"/../js/json2.js #rhino needs this, jsc does not
RUNNER="$BINDIR"/jsrun.sh

# resolve module id to url

JSCMD="var resolver = new Resolver(\"$2\", $CONFIG); print(resolver.toUrl(\"$1\"));"
MODURL=$("$RUNNER" "$JSCMD" "$RESOLVER")
MODSRC=$($ESCAPER < "$MODURL")

# find dependencies in this module

JSCMD="var resolver = new Resolver(\"$1\", $CONFIG); print(JSON.stringify(parser.parse(\"$MODSRC\").map(function (dep) { return resolver.toModuleInfo(dep); })));"
"$RUNNER" "$JSCMD" "$RESOLVER" "$PARSER" "$JSON"
