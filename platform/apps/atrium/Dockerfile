FROM oven/bun:1.1.30 AS bun

FROM node:22-bookworm-slim AS frontend

WORKDIR /app/frontend

COPY --from=bun /usr/local/bin/bun /usr/local/bin/bun
COPY --from=bun /usr/local/bin/bunx /usr/local/bin/bunx

COPY frontend/package*.json ./
RUN if [ -f bun.lockb ]; then /usr/local/bin/bun install --frozen-lockfile; else /usr/local/bin/bun install; fi

COPY frontend ./ 
RUN /usr/local/bin/bun run build

FROM golang:1.25.5-alpine AS build

WORKDIR /src/backend

COPY backend/go.mod backend/go.sum ./
RUN go mod download

COPY backend/internal ./internal
COPY backend/cmd ./cmd
COPY --from=frontend /app/backend/internal/web/dist ./internal/web/dist

RUN CGO_ENABLED=0 GOOS=linux go build -o /out/server ./cmd/server

FROM gcr.io/distroless/static:nonroot

WORKDIR /app

COPY --from=build /out/server ./server
COPY backend/migrations ./migrations
COPY backend/configs ./configs

EXPOSE 8080

USER nonroot:nonroot

CMD ["./server"]
