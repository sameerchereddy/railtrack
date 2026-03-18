.PHONY: up down logs migrate frontend install

## Start all services with Docker Compose
up:
	docker compose up --build -d

## Stop all services
down:
	docker compose down

## Tail logs from all services
logs:
	docker compose logs -f

## Run database migrations (requires local MongoDB or --uri flag)
## Usage: make migrate URI=mongodb://localhost:27017 DB=railtrack
migrate:
	SHARED_PATH=./shared python -m migrations.runner up \
		--uri $(or $(URI),mongodb://localhost:27017) \
		--db $(or $(DB),railtrack)

## Show migration status
migrate-status:
	SHARED_PATH=./shared python -m migrations.runner status \
		--uri $(or $(URI),mongodb://localhost:27017) \
		--db $(or $(DB),railtrack)

## Install frontend dependencies
frontend-install:
	cd frontend && npm install

## Start frontend dev server
frontend-dev:
	cd frontend && npm run dev

## Build frontend for production
frontend-build:
	cd frontend && npm run build

## Type-check frontend
frontend-typecheck:
	cd frontend && npm run typecheck
