# LandSight — Developer Makefile
# Usage: make <target>
# On Windows: use Git Bash or WSL, or run commands manually.

.PHONY: help run run-backend run-frontend migrate test lint clean

help: ## Show this help message
	@echo ""
	@echo "  LandSight — Available Commands"
	@echo "  ─────────────────────────────────────────────────────"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | \
		awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-20s\033[0m %s\n", $$1, $$2}'
	@echo ""

# ── Local Dev ─────────────────────────────────────────────────────────────────

run: ## Start both backend and frontend (requires two terminal tabs)
	@echo "Run 'make run-backend' in one terminal and 'make run-frontend' in another."

run-backend: ## Start Flask backend (activates venv automatically)
	cd backend && .\venv\Scripts\activate && python run.py

run-frontend: ## Start Vite dev server
	cd frontend && npm run dev

# ── Database ──────────────────────────────────────────────────────────────────

migrate: ## Apply Flask-Migrate database migrations
	cd backend && .\venv\Scripts\activate && flask db upgrade

migrate-create: ## Create a new migration (usage: make migrate-create MSG="add column x")
	cd backend && .\venv\Scripts\activate && flask db migrate -m "$(MSG)"

create-db: ## Initialise the database (dev only)
	cd backend && .\venv\Scripts\activate && python create_db.py

# ── Testing & Linting ─────────────────────────────────────────────────────────

test: ## Run backend unit tests (pytest)
	cd backend && .\venv\Scripts\activate && pytest -v

lint: ## Lint Python (ruff) and JS (eslint)
	cd backend && .\venv\Scripts\activate && ruff check .
	cd frontend && npx eslint src

lint-fix: ## Auto-fix lint issues
	cd backend && .\venv\Scripts\activate && ruff check . --fix
	cd frontend && npx eslint src --fix

# ── Cleanup ───────────────────────────────────────────────────────────────────

clean: ## Remove Python cache files
	find . -type d -name __pycache__ -exec rm -rf {} + 2>/dev/null; true
	find . -name "*.pyc" -delete 2>/dev/null; true
