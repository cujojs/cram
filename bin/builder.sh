#!/bin/bash
# output builder
# input: module ids
# output: built js file
# assumes $JSDIR, $JSRUN, $FETCHER, $CONFIG are defined

# list of modules to be built is sent as parameter info

# declare actors

BUILDER="$JSDIR"/Builder.js
WRITER="$JSDIR"/writer.js
RESOLVER="$JSDIR"/Resolver.js
LOADER="$JSDIR"/SimpleAmdLoader.js
BUILD="$JSDIR"/build.js

# create javascript snippet

MODULEINFOFILE=$1

# Build a new file containing the call to build() with the (potentially huge)
# module info array
JSFILE="${MODULEINFOFILE}-build.js"

echo -n "build($CONFIG, " > $JSFILE
cat $MODULEINFOFILE >> $JSFILE
echo -n ");" >> $JSFILE

# pull out config options

OUTPUT=$(echo "$CONFIG" | "$BINDIR"/getjsonstring.sh "destFile")
OUTPUT_DIR=$(dirname $OUTPUT)
mkdir -p "$OUTPUT_DIR"

# execute it
# NOTE: No first param, because we already have the build() in the
# $JSFILE.  Trying to put the build() call as text on the command line here
# can exceed the shell's argument length!
"$JSRUN" '' "$BUILDER" "$LOADER" "$FETCHER" "$WRITER" "$RESOLVER" "$BUILD" "$JSFILE" > "$OUTPUT"
