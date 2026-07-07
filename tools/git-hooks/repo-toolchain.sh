# Shared local Node/pnpm setup for Open Agent Toolkit repo hooks.
repo_root=$(git rev-parse --show-toplevel 2>/dev/null || pwd)
cd "$repo_root" || exit 1

load_repo_node() {
  if [ ! -f ".nvmrc" ]; then
    return 0
  fi

  if [ -n "${NVM_DIR:-}" ] && [ -s "$NVM_DIR/nvm.sh" ]; then
    # shellcheck source=/dev/null
    . "$NVM_DIR/nvm.sh" >/dev/null 2>&1 || return 0
  elif [ -n "${HOME:-}" ] && [ -s "$HOME/.nvm/nvm.sh" ]; then
    # shellcheck source=/dev/null
    . "$HOME/.nvm/nvm.sh" >/dev/null 2>&1 || return 0
  else
    return 0
  fi

  nvm use --silent >/dev/null 2>&1 || true
}

run_pnpm() {
  if command -v corepack >/dev/null 2>&1; then
    corepack pnpm "$@"
  elif command -v pnpm >/dev/null 2>&1; then
    pnpm "$@"
  else
    return 127
  fi
}

load_repo_node
