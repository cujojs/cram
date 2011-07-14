#!/bin/bash
# starts the optimizer

ME=`basename $0`
BINDIR=`dirname $0`
BINDIR=${BINDIR:-.}
JSDIR="$BINDIR"/../js
TMPDIR=$(mktemp -t cram.XXXXXX -d)

# Testing only
# TMPDIR=/tmp

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

# optimization for jsrun.sh
JSTMP=$(mktemp -t cram.XXXXXX)
export JSTMP

USAGE="$ME [-e|--engine path_to_js_engine] [-o|--output build_output_file] -r|--root root_module_id -c|--config config_file"

#COLLECTOR="$BINDIR"/collector.sh
BUILDER="$BINDIR"/builder.sh
JSRUN="$BINDIR/jsrun.sh"

# parse options

for arg in "$@"
do

	case "$arg" in

		-r|--root)
			shift
			ROOTID=$1
			shift
		;;

		-e|--engine)
			shift
			JSENGINE=$1
			shift
		;;

		-c|--config)
			shift
			CONFIG=$(echo $(cat "$1")) #echo removes line feeds!
			shift
		;;

		-h|--help)
			echo "$USAGE"
			exit 0
		;;
		
		-o|--output)
			shift
			BUILD_DEST=$1
			shift
		;;

	esac

done

if [[ "$JSENGINE" = "" ]]; then
	echo "Cannot find Rhino. You must specify a JavaScript engine with --engine"
	exit 1
fi

# If no output file specified on the command line, look for it in the config file
if [[ "$BUILD_DEST" = "" ]]; then
	BUILD_DEST=$(echo "$CONFIG" | "$BINDIR"/getjsonstring.sh "destFile")

	if [[ "$BUILD_DEST" = "" ]]; then
		echo "You must specify a build destination on the command line with --output or in the config file using destFile"
		exit 1
	fi
fi

# all shell-driven js engines must have at least print() and load()
# the following var holds name=bool pairs of other js engine
# capabilities

ENGINECAPS=$("$JSENGINE" "$JSDIR/jsEngineCaps.js")

echo "js engine: $JSENGINE $JSENGINEOPTS ($ENGINECAPS)"
echo "temp folder: $TMPDIR"

if [[ ! "$ENGINECAPS" =~ hasJson=true  ]]; then
	#rhino 1.7r2  needs this, jsc and rhino 1.7r3 do not
	JSON="$JSDIR"/json2.js
fi

if [[ ! "$ENGINECAPS" =~ hasReadFile=true ]]; then
	FETCHER="$TMPDIR"/prefetcher.js
else
	FETCHER="$JSDIR"/readFileFetcher.js
fi

export TMPDIR JSRUN ENGINECAPS JSON BINDIR JSDIR CONFIG FETCHER BUILD_DEST

RESOLVER="$JSDIR"/Resolver.js
LOADER="$JSDIR"/SimpleAmdLoader.js
ANALYZER="$JSDIR"/Analyzer.js
ANALYZE="$JSDIR"/analyze.js

MODULEINFO="$TMPDIR/moduleinfo.js"

JSCMD="print(JSON.stringify(analyze(\"$ROOTID\", \"\", $CONFIG)));"
"$JSRUN" "$JSCMD" "$FETCHER" "$RESOLVER" "$LOADER" "$JSON" "$ANALYZER" "$ANALYZE" > "$MODULEINFO"

# echo "found modules $MODULEINFO"
# cat "$MODULEINFO"

# we're ready to build!

"$BUILDER" "$MODULEINFO"
