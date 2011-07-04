#!/bin/bash

sed -E 's/.*"'$1'"[^:]*\:[^"]*"([^"]+)".*/\1/'

# tried to get this to work:
# $1 = name of property
# -f 'g' = regex options, such as "g"

#if [[ '-f' == $1 ]]; then
#	OPTIONS=$2
#	shift;
#	shift;
#fi

#sed 's/.*"'$@'"[^:]*\:[^"]*"([^"]+)".*/\1/'$OPTIONS''

