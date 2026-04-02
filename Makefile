# Makefile for common development tasks

.PHONY: help setup dev build test lint format clean docker-up docker-down migrate

help:
	@echo "Available commands:"
	@echo "  make setup         - Initialize project"
	@echo "  make dev           - Start development server"
	@echo "  make build         - Build TypeScript"
	@echo "  make test          - Run tests"
	@echo "  make lint          - Run linter"
	@echo "  make format        - Format code"
	@echo "  make clean         - Clean dependencies and build"
	@echo "  make docker-up     - Start Docker services"
	@echo "  make docker-down   - Stop Docker services"
	@echo "  make migrate       - Run database migrations"

setup:
	bash scripts/setup.sh

dev:
	npm run dev

build:
	npm run build

test:
	npm run test

lint:
	npm run lint

format:
	npm run format

clean:
	bash scripts/clean.sh

docker-up:
	docker-compose up -d

docker-down:
	docker-compose down

migrate:
	npm run db:migrate
