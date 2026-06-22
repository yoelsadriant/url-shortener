BACKEND  := services/backend
FRONTEND := services/frontend
COMPOSE  := docker compose -f $(BACKEND)/compose.yml

.DEFAULT_GOAL := help

.PHONY: help install env ddb-up ddb-down ddb-logs init backend frontend dev down clean test test-e2e

help:
	@awk 'BEGIN{FS=":.*##"} /^[a-zA-Z_-]+:.*##/ {printf "  \033[36m%-14s\033[0m %s\n",$$1,$$2}' $(MAKEFILE_LIST)

install: ## Install backend + frontend deps
	npm --prefix $(BACKEND) install
	npm --prefix $(FRONTEND) install

env: $(BACKEND)/.env ## Create backend .env from .env.example if missing
$(BACKEND)/.env:
	cp $(BACKEND)/.env.example $(BACKEND)/.env
	@echo "created $(BACKEND)/.env"

ddb-up: ## Start DynamoDB Local in the background
	$(COMPOSE) --profile dev up -d dynamodb-local

ddb-down: ## Stop DynamoDB Local
	$(COMPOSE) --profile dev down

ddb-logs: ## Tail DynamoDB Local logs
	$(COMPOSE) --profile dev logs -f dynamodb-local

init: env ddb-up ## Ensure DDB tables exist (creates them if missing)
	@set -a; . ./$(BACKEND)/.env; set +a; \
	  ./$(BACKEND)/scripts/init-tables.sh

backend: env ## Run the backend in watch mode (assumes DDB is up + init done)
	npm --prefix $(BACKEND) run start:dev

frontend: ## Run the frontend (Vite) dev server
	npm --prefix $(FRONTEND) run dev

dev: init ## Bring up the full dev stack — backend in foreground, run `make frontend` in another shell
	$(MAKE) backend

down: ## Stop the dev stack
	$(COMPOSE) --profile dev down

clean: ## Remove build output + node_modules
	rm -rf $(BACKEND)/dist $(BACKEND)/coverage $(FRONTEND)/dist $(FRONTEND)/coverage
	rm -rf $(BACKEND)/node_modules $(FRONTEND)/node_modules

test: ## Run backend + frontend unit tests
	npm --prefix $(BACKEND) test
	npm --prefix $(FRONTEND) run test:run

test-e2e: ## Run backend e2e suite (in-memory DDB stub)
	npm --prefix $(BACKEND) run test:e2e
