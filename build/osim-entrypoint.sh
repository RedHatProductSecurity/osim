#!/bin/sh

# Run entrypoint setup scripts
for file in /entrypoint.d/*.sh; do
    if [ -x "$file" ]; then
        "$file"
    fi
done

# Setup complete - start the main thing
exec "$@"
