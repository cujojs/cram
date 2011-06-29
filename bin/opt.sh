# starts the optimizer

BINDIR=`dirname $0`
BINDIR=${BINDIR:-.}

USAGE="opt -r root_module_id -e path_to_js_engine"
COLLECTOR="$BINDIR/collector.sh"

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

		-h|--help)
			echo "$USAGE"
			exit 0
		;;

	esac

done

export JSENGINE BINDIR

#echo "js engine = $JSENGINE"

. "$COLLECTOR" "$ROOTID"
