# dependency collector
# input: module id
# output: dependency module ids separated by commas
# assumes $JSENGINE and $BINDIR are defined

ESCAPER="$BINDIR"/jsescape.sh

MODSRC=`$ESCAPER < "$1"`

JSCMD="print(1);"
#JSCMD="print(parser.parse(\\\"$MODSRC\\\"));"

#echo "$MODSRC"
#echo "$JSCMD"

"$JSENGINE" "$BINDIR/../js/parser.js" -e \"$JSCMD\"
