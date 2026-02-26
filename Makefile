.PHONY: dev dev-client dev-server infra infra-down migrate-up migrate-down build clean

# Start all infrastructure (DB + Redis)
infra:
	docker compose up -d postgres redis

# Stop infrastructure
infra-down:
	docker compose down

# Start Next.js dev server
dev-client:
	cd client && pnpm dev

# Start Go dev server (with hot reload via air, or plain go run)
dev-server:
	cd server && go run ./cmd/api

# Start everything
dev: infra
	@echo "Infrastructure started. Run 'make dev-client' and 'make dev-server' in separate terminals."

# Build Go server
build-server:
	cd server && CGO_ENABLED=0 go build -o bin/api ./cmd/api

# Docker build all
build:
	docker compose build

# Run DB migrations up
migrate-up:
	docker exec -i slimetopia-db psql -U slime -d slimetopia < server/migrations/000001_init_schema.up.sql

# Run DB migrations down
migrate-down:
	docker exec -i slimetopia-db psql -U slime -d slimetopia < server/migrations/000001_init_schema.down.sql

# Clean build artifacts
clean:
	rm -rf server/bin client/.next
