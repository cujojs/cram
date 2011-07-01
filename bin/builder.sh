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

# create javascript bootstrap code

JS=<<EOT
var builder = new Builder();
builder.resolver = new Resolver('', $CONFIG);
builder.loader = new Loader();
builder.loader.resolver = builder.resolver;
builder.fetcher = fetcher;
builder.writer = writer.getWriter();
builder.build($MODULEINFO, $CONFIG);
print(writer.getOutput());
EOT

echo "bootstrap: $JS"

JS=$(echo -n "$JS") # remove newlines

echo "bootstrap: $JS"

# execute it

"$JSRUN" "$JS" "$BUILDER" "$LOADER" "$FETCHER" "$WRITER" "$RESOLVER"

open -e "$JSTMP"
