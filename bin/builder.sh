#!/bin/bash
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
BUILD="$JSDIR"/build.js

# create javascript snippet

JS="build($CONFIG, $MODULEINFO);"

# execute it

"$JSRUN" "$JS" "$BUILDER" "$LOADER" "$FETCHER" "$WRITER" "$RESOLVER" "$BUILD"

