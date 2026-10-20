FROM node:26.12.0-bookworm-slim@sha256:298992629d69bbd5b2b03ad57094d8e4fcb3a8eeb7c4e25d29de656519568913 AS web
WORKDIR /src
RUN npm install --global npm@12.2.0 \
    && npm install --global pnpm@12.14.0 --allow-scripts=pnpm
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/web/package.json apps/web/package.json
COPY tools/contracts/package.json tools/contracts/package.json
RUN pnpm install --frozen-lockfile
COPY apps/web apps/web
COPY tsconfig.json ./
COPY scripts/build-pwa.mjs scripts/build-pwa.mjs
RUN pnpm --filter @math-tutor/web build

# uv supplies the standalone Python 3.15 runtime copied into the final image.
FROM python:3.15.0-slim-bookworm@sha256:2a41267d9de9d358f77a1de356e0f16ecba8d39827855be0ce9ef4792edce402 AS api
ENV UV_PYTHON_INSTALL_DIR=/opt/python UV_PYTHON_PREFERENCE=only-managed UV_LINK_MODE=copy
RUN pip install --no-cache-dir uv==0.13.2
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

FROM gcr.io/distroless/cc-debian13:nonroot@sha256:e792ab3d241a468a4fd7519ddbbebe66b49b5f365771716ea688ad40b6c6f1c2
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
