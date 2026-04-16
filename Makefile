# Vespera Tickets - Development Commands
# Run with: make <command>

.DEFAULT_GOAL := help

# Colors
RED := \033[0;31m
GREEN := \033[0;32m
YELLOW := \033[0;33m
BLUE := \033[0;34m
NC := \033[0m

# =============================================================================
# QUICK START
# =============================================================================

help:
	@echo ""
	@echo "$(BLUE)Vespera Tickets - Dev Commands$(NC)"
	@echo "=============================="
	@echo ""
	@echo "$(GREEN)make dev$(NC)         - Start everything (db + backend + frontend)"
	@echo "$(GREEN)make stop$(NC)        - Stop all services"
	@echo ""
	@echo "$(YELLOW)Database:$(NC)"
	@echo "  make db-start    - Start PostgreSQL (Docker)"
	@echo "  make db-stop     - Stop PostgreSQL"
	@echo "  make db-reset    - Remove and recreate database"
	@echo "  make db-setup    - Setup database (generate + migrate)"
	@echo ""
	@echo "$(YELLOW)Services:$(NC)"
	@echo "  make backend     - Start backend only"
	@echo "  make frontend   - Start frontend only"
	@echo ""
	@echo "$(YELLOW)Debugging:$(NC)"
	@echo "  make logs       - View logs"
	@echo "  make test-api  - Test API endpoint"
	@echo ""

# =============================================================================
# DATABASE (Docker PostgreSQL)
# =============================================================================

IS_RUNNING := $(shell docker ps --format '{{.Names}}' 2>/dev/null | grep -q backend-postgres && echo "true" || echo "false")

db-start:
	@echo "$(YELLOW)Starting PostgreSQL...$(NC)"
	@if docker ps --format '{{.Names}}' 2>/dev/null | grep -q "^backend-postgres$$"; then \
		echo "$(GREEN)✓ PostgreSQL already running$(NC)"; \
	elif docker ps -a --format '{{.Names}}' 2>/dev/null | grep -q "^backend-postgres$$"; then \
		echo "$(YELLOW)Starting existing container...$(NC)"; \
		docker start backend-postgres; \
	else \
		echo "$(YELLOW)Creating new container...$(NC)"; \
		docker run -d --name backend-postgres -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=vespera -p 5432:5432 postgres:16; \
	fi

db-stop:
	@echo "$(YELLOW)Stopping PostgreSQL...$(NC)"
	@docker stop backend-postgres 2>/dev/null && echo "$(GREEN)✓ Stopped$(NC)" || echo "$(YELLOW)Container not running$(NC)"

db-remove:
	@echo "$(RED)Removing PostgreSQL container...$(NC)"
	@docker rm -f backend-postgres 2>/dev/null && echo "$(GREEN)✓ Removed$(NC)" || true

db-reset: db-remove db-start

db-generate:
	@echo "$(YELLOW)Generating Prisma client...$(NC)"
	@cd backend && npx prisma generate

db-migrate:
	@echo "$(YELLOW)Running database migrations...$(NC)"
	@cd backend && npx prisma migrate deploy

db-setup: db-start db-generate db-migrate
	@echo "$(GREEN)✓ Database ready$(NC)"

# =============================================================================
# SERVICES
# =============================================================================

dev: db-start backend frontend
	@echo ""
	@echo "$(GREEN)=========================================$(NC)"
	@echo "$(GREEN)🟢 Vespera Tickets Rodando!$(NC)"
	@echo "$(GREEN)=========================================$(NC)"
	@echo "$(YELLOW)Frontend:$(NC) http://localhost:5175"
	@echo "$(YELLOW)Backend:$(NC)  http://localhost:3000"
	@echo "$(YELLOW)API:$(NC)      http://localhost:3000/events"
	@echo ""

backend:
	@echo "$(YELLOW)Starting Backend...$(NC)"
	@pkill -f "node.*server.ts" 2>/dev/null || true
	@cd backend && nohup npm run dev > /tmp/vespera-backend.log 2>&1 &
	@sleep 3
	@curl -s http://localhost:3000/health > /dev/null 2>&1 && echo "$(GREEN)✓ Backend running on http://localhost:3000$(NC)" || echo "$(RED)✗ Backend failed to start$(NC)"

frontend:
	@echo "$(YELLOW)Starting Frontend...$(NC)"
	@pkill -f "vite" 2>/dev/null || true
	@cd frontend && nohup npm run dev -- --port 5175 > /tmp/vespera-frontend.log 2>&1 &
	@sleep 3
	@curl -s http://localhost:5175 > /dev/null 2>&1 && echo "$(GREEN)✓ Frontend running on http://localhost:5175$(NC)" || echo "$(RED)✗ Frontend failed to start$(NC)"

stop:
	@echo "$(YELLOW)Stopping all services...$(NC)"
	@pkill -f "node.*server.ts" 2>/dev/null || true
	@pkill -f "vite" 2>/dev/null || true
	@echo "$(GREEN)✓ Stopped$(NC)"

# =============================================================================
# DEBUG
# =============================================================================

logs:
	@echo "$(YELLOW)Backend logs:$(NC)"
	@tail -50 /tmp/vespera-backend.log 2>/dev/null || echo "No logs"
	@echo ""
	@echo "$(YELLOW)Frontend logs:$(NC)"
	@tail -20 /tmp/vespera-frontend.log 2>/dev/null || echo "No logs"

test-api:
	@echo "$(YELLOW)Testing API...$(NC)"
	@curl -s http://localhost:3000/events | head -c 200
	@echo ""

.PHONY: help dev db-start db-stop db-remove db-reset db-generate db-migrate db-setup backend frontend stop logs test-api