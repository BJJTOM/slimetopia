FROM golang:1.22-alpine AS builder

WORKDIR /app

COPY server/go.mod server/go.sum ./
RUN go mod download

COPY server/ .
RUN CGO_ENABLED=0 GOOS=linux go build -o /bin/api ./cmd/api

FROM alpine:3.20

RUN apk --no-cache add ca-certificates tzdata

WORKDIR /app
COPY --from=builder /bin/api .
COPY server/migrations/ ./migrations/
COPY shared/ ./shared/

EXPOSE 8080

CMD ["./api"]
