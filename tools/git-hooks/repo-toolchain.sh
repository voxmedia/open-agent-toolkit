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

cleanup_pnpm_shim() {
  if [ -n "${OAT_HOOK_PNPM_SHIM:-}" ] && [ -d "$OAT_HOOK_PNPM_SHIM" ]; then
    rm -rf "$OAT_HOOK_PNPM_SHIM"
  fi
}

install_pnpm_shim() {
  if ! command -v corepack >/dev/null 2>&1; then
    return 0
  fi

  shim_dir=$(mktemp -d "${TMPDIR:-/tmp}/oat-hook-pnpm.XXXXXX" 2>/dev/null || true)
  if [ -z "$shim_dir" ]; then
    return 0
  fi

  cat > "$shim_dir/pnpm" <<'EOF'
#!/bin/sh
exec corepack pnpm "$@"
EOF
  chmod +x "$shim_dir/pnpm" || return 0

  OAT_HOOK_PNPM_SHIM="$shim_dir"
  export OAT_HOOK_PNPM_SHIM
  PATH="$shim_dir:$PATH"
  export PATH
  trap cleanup_pnpm_shim EXIT HUP INT TERM
}

load_repo_node
install_pnpm_shim
