#!/bin/sh
set -e

#increase timeout for lighthouse
sed -i 's/const DEFAULT_PROTOCOL_TIMEOUT =.*/const DEFAULT_PROTOCOL_TIMEOUT = 450000;/' /usr/src/garie-plugin/node_modules/lighthouse/lighthouse-core/gather/driver.js

if [ -n "$CONFIG" ]; then
	echo "Found configuration variable, will write it to the /usr/src/garie-plugin/config.json"
	echo "$CONFIG" > /usr/src/garie-plugin/config.json
fi

exec "$@"
