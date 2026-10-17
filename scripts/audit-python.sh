#!/bin/sh
set -eu
audit_uv=${UV:-uv}
requirements_file=$(mktemp /tmp/math-tutor-audit-XXXXXX.txt)
trap 'rm -f "$requirements_file"' EXIT HUP INT TERM
"$audit_uv" export --locked --format requirements-txt --no-emit-project --output-file "$requirements_file" >/dev/null
"$audit_uv" run --locked --no-env-file pip-audit --disable-pip --require-hashes -r "$requirements_file"
