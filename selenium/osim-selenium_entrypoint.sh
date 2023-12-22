#!/bin/bash

set -x
set -e

for exe in /entrypoint.d/*; do
    if [[ -x "$exe" ]]; then "$exe"; fi
done

# from selenium image:
# CMD ["/opt/bin/entry_point.sh"]
exec /opt/bin/entry_point.sh

# podman run -d -p 4444:4444 -p 7900:7900 --shm-size="2g" osim-selenium
# http://localhost:7900/?autoconnect=1&resize=scale&password=secret
