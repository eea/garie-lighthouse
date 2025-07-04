#!/bin/sh
set -e

#increase timeout for lighthouse - now handled via configuration in utils.js

if [ -n "$CONFIG" ]; then
	echo "Found configuration variable, will write it to the /usr/src/garie-plugin/config.json"
	echo "$CONFIG" > /usr/src/garie-plugin/config.json
fi

exec "$@"
