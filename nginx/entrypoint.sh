#!/bin/sh

set -eu

if [ "${DEBUG:-false}" = "true" ]; then
    set -x
fi

# shellcheck disable=SC2155
export HOST_IP="$(curl --max-time 3 --silent --fail --show-error http://169.254.169.254/latest/meta-data/local-ipv4 || printf 'UNAVAILABLE')"

< /etc/nginx/conf.d/default.conf.template gomplate > /etc/nginx/conf.d/default.conf

nginx -g "daemon off;"
