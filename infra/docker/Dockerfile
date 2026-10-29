FROM node:26.13.0-bookworm-slim@sha256:bc0a2afd3b74ce12222fc8bab99271e66257f021078f5f4a5d687a77d280c1d9 AS web
WORKDIR /src
RUN npm install --global npm@12.2.1 \
    && npm install --global pnpm@12.16.1 --allow-scripts=pnpm
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/web/package.json apps/web/package.json
COPY tools/contracts/package.json tools/contracts/package.json
RUN pnpm install --frozen-lockfile
COPY apps/web apps/web
COPY tsconfig.json ./
COPY scripts/build-pwa.mjs scripts/build-pwa.mjs
RUN pnpm --filter @math-tutor/web build

# uv supplies the standalone Python 3.15 runtime copied into the final image.
FROM python:3.15.2-slim-bookworm@sha256:4e03260adeeebafccd084f3584e6b84823aba5651cfb53ef8a078ed441ddf9cd AS api
ENV UV_PYTHON_INSTALL_DIR=/opt/python UV_PYTHON_PREFERENCE=only-managed UV_LINK_MODE=copy
RUN pip install --no-cache-dir uv==0.13.6
WORKDIR /app
COPY pyproject.toml uv.lock .python-version ./
COPY apps/api/src apps/api/src
RUN uv sync --locked --no-dev --python "$(cat .python-version)" --python-preference only-managed
# Installers are build tools. Remove their code and bundled wheels from the
# standalone interpreter; application dependencies live in the separate venv.
RUN .venv/bin/python - <<'PYTHON'
import shutil
import sys
from pathlib import Path
runtime = Path(sys.base_prefix)
stdlib = runtime / f"lib/python{sys.version_info.major}.{sys.version_info.minor}"
for directory in (stdlib / "site-packages", stdlib / "ensurepip"):
    shutil.rmtree(directory)
for installer in (runtime / "bin").glob("pip*"):
    installer.unlink()
PYTHON

FROM gcr.io/distroless/cc-debian13:nonroot@sha256:3ee00291cf386ec52a552e6a858d555debd74776eb4bfa53fa3df2cd6677515e
COPY --from=api /opt/python /opt/python
COPY --from=api /app/.venv /app/.venv
COPY --from=api /app/apps/api/src /app/apps/api/src
COPY apps/api/migrations /app/apps/api/migrations
COPY apps/api/alembic.ini /app/apps/api/alembic.ini
COPY --from=web /src/apps/web/dist /app/web
ENV PATH=/app/.venv/bin:/usr/bin DATABASE_URL=sqlite+pysqlite:////app/data/math_tutor.sqlite3 MATH_TUTOR_DATA_DIR=/app/data PYTHONDONTWRITEBYTECODE=1
WORKDIR /app/apps/api
USER 10001:10001
EXPOSE 8000
CMD ["uvicorn", "math_tutor.api.app:app", "--host", "0.0.0.0", "--port", "8000", "--no-proxy-headers", "--no-access-log"]
