#!/usr/bin/env bash

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
VENV_DIR="${REPO_ROOT}/.venv"
PYTEST_CMD="python3 -m pytest backend/app/tests/test_ssm_secrets.py -q"
VERIFICATION_DOC="${REPO_ROOT}/.planning/phases/12-stabilize-secrets-bootstrap-and-close-phase-09-verification/12-VERIFICATION.md"

select_python() {
  if command -v python3.12 >/dev/null 2>&1; then
    echo "python3.12"
    return
  fi

  echo "python3"
}

stage() {
  echo "[ssm-tests] $1"
}

ensure_automated_evidence_heading() {
  if [[ ! -f "${VERIFICATION_DOC}" ]]; then
    cat >"${VERIFICATION_DOC}" <<'EOF'
# Phase 12 Verification

## Automated Evidence
EOF
    return
  fi

  if ! grep -q "^## Automated Evidence" "${VERIFICATION_DOC}"; then
    printf "\n## Automated Evidence\n" >>"${VERIFICATION_DOC}"
  fi
}

append_evidence() {
  local exit_code="$1"
  local status="PASS"
  local timestamp

  if [[ "${exit_code}" -ne 0 ]]; then
    status="FAIL"
  fi

  timestamp="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"

  {
    printf "\n- %s | script: infrastructure/scripts/run-ssm-secret-tests.sh | command: %s | exit_code: %s | result: %s\n" "${timestamp}" "${PYTEST_CMD}" "${exit_code}" "${status}"
  } >>"${VERIFICATION_DOC}"
}

run_pytest_with_evidence() {
  local exit_code=0

  set +e
  (
    cd "${REPO_ROOT}"
    export PYTHONPATH=backend
    ${PYTEST_CMD}
  )
  exit_code=$?
  set -e

  append_evidence "${exit_code}"

  if [[ "${exit_code}" -ne 0 ]]; then
    stage "pytest failed (exit ${exit_code})"
    exit "${exit_code}"
  fi
}

main() {
  local bootstrap_python
  bootstrap_python="$(select_python)"

  stage "ensuring virtualenv exists at .venv"
  if [[ ! -d "${VENV_DIR}" ]]; then
    (
      cd "${REPO_ROOT}"
      if [[ "${bootstrap_python}" == "python3.12" ]]; then
        python3.12 -m venv .venv
      else
        python3 -m venv .venv
      fi
    )
  fi

  stage "installing backend requirements"
  "${VENV_DIR}/bin/python" -m pip install --upgrade pip >/dev/null
  "${VENV_DIR}/bin/python" -m pip install -r "${REPO_ROOT}/backend/requirements.txt" >/dev/null

  stage "ensuring verification artifact heading"
  ensure_automated_evidence_heading

  stage "running SSM secret bootstrap pytest suite"
  export PATH="${VENV_DIR}/bin:${PATH}"
  run_pytest_with_evidence

  stage "PASS"
}

main "$@"
