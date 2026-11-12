.DEFAULT_GOAL := help
.PHONY: help init run build single preview check clean

help: ## Show available targets
	@grep -E '^[a-z]+:.*## ' $(MAKEFILE_LIST) | awk -F ':.*## ' '{printf "  make %-8s %s\n", $$1, $$2}'

init: ## Install dependencies
	pnpm install

run: ## Start dev server (hot reload, LAN accessible)
	pnpm dev

build: ## Type-check and build static site into dist/
	pnpm build

single: ## Build a single self-contained dist-single/index.html
	pnpm build:single

preview: build ## Build, then serve dist/ locally
	pnpm preview

check: ## Type-check only
	pnpm exec tsc --noEmit

clean: ## Remove build outputs
	rm -rf dist dist-single
