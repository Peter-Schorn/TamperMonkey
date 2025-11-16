#!/bin/sh

# rename all .js files in dist/ to .user.js to that tampermonkey can recognize
# them as user scripts and prompt for installation
for file in dist/*.js; do
    if [ -f "$file" ] && [ "${file%.user.js}" = "$file" ]; then
        # echo "renaming $file to ${file%.js}.user.js"
        mv "$file" "${file%.js}.user.js"
    fi
done
