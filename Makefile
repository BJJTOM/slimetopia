.PHONY: dev dev-client dev-server dev-android infra infra-down migrate-up migrate-down build build-android clean

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

# Run DB migrations up (all .up.sql files in order)
migrate-up:
	@for f in $$(ls server/migrations/*.up.sql | sort); do \
		echo "Applying $$f..."; \
		docker exec -i slimetopia-db psql -U slime -d slimetopia < $$f; \
	done

# Run DB migrations down (all .down.sql files in reverse order)
migrate-down:
	@for f in $$(ls server/migrations/*.down.sql | sort -r); do \
		echo "Reverting $$f..."; \
		docker exec -i slimetopia-db psql -U slime -d slimetopia < $$f; \
	done

# Live-reload Android dev mode (APK connects to local Next.js dev server)
dev-android:
	@if [ -z "$(LOCAL_IP)" ]; then echo "Usage: make dev-android LOCAL_IP=192.168.x.x"; exit 1; fi
	cd client && LIVE_RELOAD=true LIVE_RELOAD_URL=http://$(LOCAL_IP):3000 npx cap sync android
	cd client/android && JAVA_HOME=$$HOME/.local/jdk-21.0.10+7/Contents/Home ANDROID_HOME=$$HOME/.local/android-sdk ./gradlew assembleDebug
	@echo ""
	@echo "=== APK: client/android/app/build/outputs/apk/debug/app-debug.apk ==="
	@echo ""
	@echo "Install the APK, then run these in separate terminals:"
	@echo "  1) make dev-server"
	@echo "  2) cd client && NEXT_PUBLIC_API_URL=http://$(LOCAL_IP):8080 pnpm dev"
	@echo ""
	@echo "The app will live-reload from http://$(LOCAL_IP):3000"

# Build Android APK (set LOCAL_IP env var for API URL, e.g. make build-android LOCAL_IP=192.168.0.10)
build-android:
	@if [ -z "$(LOCAL_IP)" ]; then echo "Usage: make build-android LOCAL_IP=192.168.x.x"; exit 1; fi
	cd client && NEXT_PUBLIC_API_URL=http://$(LOCAL_IP):8080 CAPACITOR_BUILD=true pnpm build
	cd client && npx cap sync android
	cd client/android && JAVA_HOME=$$HOME/.local/jdk-21.0.10+7/Contents/Home ANDROID_HOME=$$HOME/.local/android-sdk ./gradlew assembleDebug
	@echo "APK: client/android/app/build/outputs/apk/debug/app-debug.apk"

# Clean build artifacts
clean:
	rm -rf server/bin client/.next client/out
