#!/bin/bash
# starts the optimizer

ME=`basename $0`
BINDIR=`dirname $0`
BINDIR=${BINDIR:-.}
JSDIR="$BINDIR"/../js
TMPDIR=$(mktemp -t cram -d)

# Testing only
# TMPDIR=/tmp

# Default to rhino
JSENGINE=$(which rhino)

# FIMXE: Have to use rhino interpreted mode due to Java's 64k method byte-size
# limit, since cram may generate a call to build() with a very large dependency
# array.
# See: http://coachwei.sys-con.com/node/676073/mobile
JSENGINEOPTS="-O \'-1\'"

export JSENGINE JSENGINEOPTS

# optimization for jsrun.sh
JSTMP=$(mktemp -t cram)
export JSTMP

USAGE="$ME [-e path_to_js_engine] -r root_module_id -c config_file"

#COLLECTOR="$BINDIR"/collector.sh
BUILDER="$BINDIR"/builder.sh
JSRUN="$BINDIR/jsrun.sh"

# parse options

for arg in "$@"
do

	case "$arg" in

		-r)
			shift
			ROOTID=$1
			shift
		;;

		-e|--engine)
			shift
			JSENGINE=$1
			unset JSENGINEOPTS
			export JSENGINE JSENGINEOPTS
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

	esac

done

if [[ "$JSENGINE" = "" ]]; then
	echo "Cannot find Rhino. You must specify a JavaScript engine with -e"
	echo $USAGE
	exit 1
fi

# all shell-driven js engines must have at least print() and load()
# the following var holds name=bool pairs of other js engine
# capabilities

ENGINECAPS=$("$JSENGINE" "$JSDIR/jsEngineCaps.js")

echo "js engine: $JSENGINE ($ENGINECAPS)"

if [[ ! "$ENGINECAPS" =~ hasJson=true  ]]; then
	#rhino 1.7r2  needs this, jsc and rhino 1.7r3 do not
	JSON="$JSDIR"/json2.js
fi

if [[ ! "$ENGINECAPS" =~ hasReadFile=true ]]; then
	FETCHER="$TMPDIR"/prefetcher.js
else
	FETCHER="$JSDIR"/readFileFetcher.js
fi

export JSRUN ENGINECAPS JSON BINDIR JSDIR CONFIG FETCHER

RESOLVER="$JSDIR"/Resolver.js
LOADER="$JSDIR"/SimpleAmdLoader.js
ANALYZER="$JSDIR"/Analyzer.js
ANALYZE="$JSDIR"/analyze.js

MODULEINFO="$TMPDIR/moduleinfo.js"

JSCMD="print(JSON.stringify(analyze(\"$ROOTID\", \"\", $CONFIG)));"
"$JSRUN" "$JSCMD" "$FETCHER" "$RESOLVER" "$LOADER" "$JSON" "$ANALYZER" "$ANALYZE" > "$MODULEINFO"

# echo "found modules $MODULEINFO"

# we're ready to build!

"$BUILDER" "$MODULEINFO"
