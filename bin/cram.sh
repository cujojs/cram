#!/bin/bash
# cram version 0.2
# starts the build process

echo "DO NOT USE THIS SHELL SCRIPT"
echo "This script is for future use with JavaScriptCore"
echo "To learn how to use cram, get help via the following command:"
echo "java org.mozilla.javascript.tools.shell.Main"
exit

ME=`basename $0`
BINDIR=`dirname $0`
BINDIR=${BINDIR:-.}
JSDIR="$BINDIR"/../js

# Default to rhino
JSENGINE=$(which rhino)

# FIMXE: Have to use rhino interpreted mode due to Java's 64k method byte-size
# limit, since cram may generate a call to build() with a very large dependency
# array.
# See: http://coachwei.sys-con.com/node/676073/mobile
# FIXME: Also, these opts will need to be handled differently when cram is engine-
# independent
JSENGINEOPTS="-O -1"

export JSENGINE JSENGINEOPTS

if [[ "$JSENGINE" = "" ]]; then
	echo "Cannot find Rhino. You must specify a JavaScript engine with --engine"
	exit 1
fi

echo "$JSENGINE" "$JSENGINEOPTS" "$JSDIR/cram.js" "$@"
"$JSENGINE" "$JSENGINEOPTS" "$JSDIR/cram.js" "$@"
