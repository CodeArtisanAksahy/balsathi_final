FROM node:20-bookworm-slim AS base
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

FROM base AS dependencies
COPY package.json package-lock.json ./
RUN npm ci

FROM dependencies AS build
COPY . .
RUN npm run build

FROM node:20-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV HOSTNAME=0.0.0.0

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

RUN apt-get update && apt-get install -y --no-install-recommends python3 python3-venv \
  && rm -rf /var/lib/apt/lists/* \
  && python3 -m venv /opt/balsathi-ml
COPY ml/requirements.txt ./ml/requirements.txt
RUN /opt/balsathi-ml/bin/pip install --no-cache-dir -r ./ml/requirements.txt
ENV PATH="/opt/balsathi-ml/bin:${PATH}"

COPY --from=build /app/public ./public
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
COPY --from=build /app/prisma ./prisma
COPY scripts/start-container.mjs ./scripts/start-container.mjs
COPY ml ./ml
RUN mkdir -p /app/data

EXPOSE 3000
CMD ["node", "scripts/start-container.mjs"]
