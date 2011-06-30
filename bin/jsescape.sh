sed -e 's/"/\\"/g' -e "s/\\'/\\\\'/g" | sed -n -e '1h;1!H;${;g;s/\n/\\n/g;p;}'
