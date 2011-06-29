# output builder
# input: module ids
# output: built js file
# assumes $JSENGINE and $BINDIR are defined

IDS=$1

# declare actors, config

BUILDER="$BINDIR"../js/Builder.js
FETCHER="$BINDIR"../js/fetcher.js
WRITER="$BINDIR"../js/writer.js
RESOLVER="$BINDIR"../js/Resolver.js

# create command

JS=<<EOT
var builder = new Builder();
builder.resolver = new Resolver('');
print();
EOT

# execute it
"$JSENGINE" "$BUILDER" "$FETCHER" "$WRITER" "$RESOLVER" "$JS"
