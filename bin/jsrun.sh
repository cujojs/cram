# rhino seems to force us to use -e arg or load files, s we're forced to write to a temp file:
if [ "$JSTMP" == "" ]; then
	JSTMP=$(mktemp -t cram)
fi

# save javascript to execute
JSEXEC=$1
shift

# dump dependencies into the temp file (rhino requires this, not jsc)
cat $@ > "$JSTMP"

# append javascript
echo ';'"$JSEXEC" >> "$JSTMP"

# execute it
"$JSENGINE" "$JSTMP"
