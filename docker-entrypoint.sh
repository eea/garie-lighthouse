#!/bin/sh
set -e


if [ -n "$CONFIG" ]; then
	echo "Found configuration variable, will write it to the /usr/src/garie-lighthouse/config.json"
	echo "$CONFIG" > /usr/src/garie-lighthouse/config.json
fi

exec "$@"
