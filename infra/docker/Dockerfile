FROM node:24.21.0-bookworm-slim@sha256:d6aa754f16b3197301076f047b5def2f02ea1dbbc2ca920407d46d7ec7f87b20 AS web
WORKDIR /src
RUN npm install --global pnpm@12.10.1
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/web/package.json apps/web/package.json
COPY tools/contracts/package.json tools/contracts/package.json
RUN pnpm install --frozen-lockfile
COPY apps/web apps/web
COPY tsconfig.json ./
COPY scripts/build-pwa.mjs scripts/build-pwa.mjs
RUN pnpm --filter @math-tutor/web build

FROM python:3.14.8-slim-bookworm@sha256:48b13b003dda20b16f9442b8475aa05fe21bf6579a8c881db92ffb4d8fd20f83 AS api
ENV UV_PYTHON_INSTALL_DIR=/opt/python UV_PYTHON_PREFERENCE=only-managed UV_LINK_MODE=copy
RUN pip install --no-cache-dir uv==0.12.23
WORKDIR /app/apps/api
COPY apps/api/pyproject.toml apps/api/uv.lock ./
COPY .python-version /app/.python-version
COPY apps/api/src src
RUN uv sync --locked --no-dev --python 3.14.8 --python-preference only-managed
# Installers are build tools. Remove their code and bundled wheels from the
# standalone interpreter; application dependencies live in the separate venv.
RUN .venv/bin/python - <<'PYTHON'
import shutil
import sys
from pathlib import Path
runtime = Path(sys.base_prefix)
for directory in (runtime / "lib/python3.14/site-packages", runtime / "lib/python3.14/ensurepip"):
    shutil.rmtree(directory)
for installer in (runtime / "bin").glob("pip*"):
    installer.unlink()
PYTHON

FROM gcr.io/distroless/cc-debian13:nonroot@sha256:e792ab3d241a468a4fd7519ddbbebe66b49b5f365771716ea688ad40b6c6f1c2
COPY --from=api /opt/python /opt/python
COPY --from=api /app/apps/api/.venv /app/apps/api/.venv
COPY --from=api /app/apps/api/src /app/apps/api/src
COPY apps/api/migrations /app/apps/api/migrations
COPY apps/api/alembic.ini /app/apps/api/alembic.ini
COPY --from=web /src/apps/web/dist /app/web
ENV PATH=/app/apps/api/.venv/bin:/usr/bin DATABASE_URL=sqlite+pysqlite:////app/data/math_tutor.sqlite3 MATH_TUTOR_DATA_DIR=/app/data PYTHONDONTWRITEBYTECODE=1
WORKDIR /app/apps/api
USER 10001:10001
EXPOSE 8000
CMD ["uvicorn", "math_tutor.api.app:app", "--host", "0.0.0.0", "--port", "8000", "--no-proxy-headers", "--no-access-log"]
