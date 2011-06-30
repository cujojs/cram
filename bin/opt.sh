# starts the optimizer

BINDIR=`dirname $0`
BINDIR=${BINDIR:-.}
JSDIR="$BINDIR"/../js
TMPDIR=$(mktemp -t cram -d)

# optimization for jsrun.sh
JSTMP=$(mktemp -t cram)

USAGE="opt -r root_module_id -e path_to_js_engine -c config_file"

COLLECTOR="$BINDIR/collector.sh"
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

# all shell-driven js engines must have at least print() and load()
# the following var holds name=bool pairs of other js engine
# capabilities
ENGINECAPS=$("$JSENGINE" "$JSDIR/jsEngineCaps.js")

export JSENGINE ENGINECAPS BINDIR JSDIR CONFIG

MODULEINFO=$("$COLLECTOR" "$ROOTID")

# some js engines can't fetch text resources (jsc)
# so we have to prefetch them into a js module
# note: some future plugins may force us to change this algorithm
if [[ ! "$ENGINECAPS" =~ hasReadFile=true ]]; then
	# create a temporary prefetch loader javascript module
	FETCHER="$TMPDIR"/prefetcher.js
	# append a copy of the base prefetchLoader module
	cat "$JSDIR"/prefetcher.js > "$FETCHER"
	# prefetch all modules and resources as function calls into prefetch loader
	local URLS=$("$JSRUN" "print(fetcher.extractUrls($MODULEINFO));" "$FETCHER")
	# for each module/resource: fetcher.store("text data");
	ORIGIFS=$IFS
	IFS=","
	for URL in $URLS
	do
		echo "fetcher.store(\""
		cat "$URL" | "$BINDIR"/jsescape.sh >> "$FETCHER"
		echo "\");"
	done
	IFS=$ORIGIFS
else
	FETCHER="$JSDIR"/readFilefetcher.js
fi

