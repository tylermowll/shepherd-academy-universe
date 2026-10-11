#!/bin/sh
set -eu
audit_uv=${UV:-uv}
requirements_file=$(mktemp /tmp/math-tutor-audit-XXXXXX.txt)
trap 'rm -f "$requirements_file"' EXIT HUP INT TERM
"$audit_uv" export --directory apps/api --locked --format requirements-txt --no-emit-project --output-file "$requirements_file" >/dev/null
"$audit_uv" run --directory apps/api --locked --no-env-file pip-audit --disable-pip --require-hashes -r "$requirements_file"

# Audit the locked tool environment's installed packages so Python 3.15 cannot
# skip cfn-lint's Python <3.15 requirement marker in an exported requirements file.
infra_python=$(cat tools/infra/.python-version)
infra_environment=${INFRA_PROJECT_ENVIRONMENT:-"$(pwd)/tools/infra/.venv"}
infra_packages=$(UV_PROJECT_ENVIRONMENT="$infra_environment" "$audit_uv" run \
    --project tools/infra --python "$infra_python" --locked --no-env-file \
    python -c 'import sysconfig; from importlib.metadata import version; version("cfn-lint"); print(sysconfig.get_path("purelib"))')
"$audit_uv" run --directory apps/api --locked --no-env-file pip-audit --strict --path "$infra_packages"
