# output builder
# input: module ids
# output: built js file
# assumes $JSDIR, $JSRUN, $FETCHER, $CONFIG are defined

# list of modules to be built is sent as parameter info

MODULEINFO="$@"

# declare actors

BUILDER="$JSDIR"/Builder.js
WRITER="$JSDIR"/writer.js
RESOLVER="$JSDIR"/Resolver.js
LOADER="$JSDIR"/SimpleAmdLoader.js
BOOTSTRAP="$JSDIR"/build.js

# create javascript snippet

JS="build($CONFIG, $MODULEINFO);"

echo "build snippet: $JS"

# execute it

"$JSRUN" "$JS" "$BUILDER" "$LOADER" "$FETCHER" "$WRITER" "$RESOLVER" "$BOOTSTRAP"

