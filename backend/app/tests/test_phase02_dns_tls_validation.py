import os
import subprocess
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[3]
DNS_SCRIPT = REPO_ROOT / "infrastructure/scripts/dns-delegation-check.sh"
TLS_SCRIPT = REPO_ROOT / "infrastructure/scripts/tls-readiness-check.sh"
SMOKE_SCRIPT = REPO_ROOT / "infrastructure/scripts/terraform-smoke.sh"


def _write_executable(path: Path, content: str) -> None:
    path.write_text(content)
    path.chmod(0o755)


def _mock_env(mock_bin: Path) -> dict:
    env = os.environ.copy()
    env["PATH"] = f"{mock_bin}:{env['PATH']}"
    return env


def test_terraform_dns_tls_contracts_are_declared():
    variables_tf = (REPO_ROOT / "infrastructure/terraform/environments/prod/variables.tf").read_text()
    locals_tf = (REPO_ROOT / "infrastructure/terraform/environments/prod/locals.tf").read_text()
    main_tf = (REPO_ROOT / "infrastructure/terraform/environments/prod/main.tf").read_text()
    outputs_tf = (REPO_ROOT / "infrastructure/terraform/environments/prod/outputs.tf").read_text()

    assert 'variable "base_domain"' in variables_tf
    assert 'variable "frontend_elastic_ip"' in variables_tf
    assert 'variable "api_gateway_alias_target_name"' in variables_tf
    assert 'variable "api_gateway_alias_target_zone_id"' in variables_tf
    assert "300" in locals_tf

    assert 'resource "aws_route53_zone" "primary"' in main_tf
    assert 'resource "aws_route53_record" "apex_a"' in main_tf
    assert 'resource "aws_route53_record" "wildcard_a"' in main_tf
    assert 'resource "aws_route53_record" "api_alias_a"' in main_tf
    assert 'resource "aws_acm_certificate" "api_custom_domain"' in main_tf

    assert 'output "route53_hosted_zone_name_servers"' in outputs_tf
    assert 'output "dns_apex_record_target_eip"' in outputs_tf
    assert 'output "dns_wildcard_record_target_eip"' in outputs_tf
    assert 'output "dns_api_alias_target_name"' in outputs_tf
    assert 'output "dns_api_alias_target_zone_id"' in outputs_tf


def test_dns_check_times_out_with_blocked_status_and_resume(tmp_path):
    mock_bin = tmp_path / "bin"
    mock_bin.mkdir()

    _write_executable(
        mock_bin / "terraform",
        "#!/usr/bin/env bash\n"
        "if [[ \"$*\" == *\"output -json route53_hosted_zone_name_servers\"* ]]; then\n"
        "  printf '[\"ns-1.awsdns.com\",\"ns-2.awsdns.net\"]\\n'\n"
        "fi\n"
        "exit 0\n",
    )

    _write_executable(
        mock_bin / "dig",
        "#!/usr/bin/env bash\n"
        "if [[ \"$2\" == \"NS\" ]]; then\n"
        "  printf 'ns-mismatch-1.example.com.\\n'\n"
        "elif [[ \"$2\" == \"A\" ]]; then\n"
        "  :\n"
        "fi\n"
        "exit 0\n",
    )

    result = subprocess.run(
        [
            "bash",
            str(DNS_SCRIPT),
            "--domain",
            "matchcota.tech",
            "--wildcard-sample",
            "demo.matchcota.tech",
            "--api-host",
            "api.matchcota.tech",
            "--timeout",
            "1",
            "--interval",
            "1",
        ],
        cwd=REPO_ROOT,
        env=_mock_env(mock_bin),
        capture_output=True,
        text=True,
    )

    output = result.stdout + result.stderr
    assert result.returncode == 2
    assert "STATUS: blocked-waiting-for-delegation" in output
    assert "RESUME: Run after registrar NS update has propagated" in output


def test_tls_check_requires_all_domains_and_times_out(tmp_path):
    mock_bin = tmp_path / "bin"
    mock_bin.mkdir()

    _write_executable(
        mock_bin / "openssl",
        "#!/usr/bin/env bash\n"
        "if [[ \"$*\" == *\"-connect api.matchcota.tech:443\"* ]]; then\n"
        "  exit 1\n"
        "fi\n"
        "printf 'Verification: OK\\n'\n"
        "exit 0\n",
    )

    result = subprocess.run(
        [
            "bash",
            str(TLS_SCRIPT),
            "--apex",
            "matchcota.tech",
            "--wildcard-sample",
            "demo.matchcota.tech",
            "--api",
            "api.matchcota.tech",
            "--timeout",
            "1",
            "--interval",
            "1",
        ],
        cwd=REPO_ROOT,
        env=_mock_env(mock_bin),
        capture_output=True,
        text=True,
    )

    output = result.stdout + result.stderr
    assert result.returncode == 2
    assert "SUMMARY apex=PASS wildcard=PASS api=FAIL" in output
    assert "OVERALL: FAIL (timeout 1s reached)" in output


def test_smoke_wires_dns_stage_and_stops_before_tls_on_dns_failure(tmp_path):
    mock_bin = tmp_path / "bin"
    mock_bin.mkdir()

    _write_executable(
        mock_bin / "aws",
        "#!/usr/bin/env bash\n"
        "if [[ \"$1\" == \"configure\" && \"$2\" == \"get\" && \"$3\" == \"region\" ]]; then\n"
        "  printf 'us-east-1\\n'\n"
        "  exit 0\n"
        "fi\n"
        "if [[ \"$1\" == \"sts\" && \"$2\" == \"get-caller-identity\" ]]; then\n"
        "  printf '{\"Account\":\"123\"}\\n'\n"
        "  exit 0\n"
        "fi\n"
        "exit 0\n",
    )

    _write_executable(
        mock_bin / "terraform",
        "#!/usr/bin/env bash\n"
        "if [[ \"$1\" == \"version\" ]]; then\n"
        "  printf '{\"terraform_version\":\"1.14.0\"}\\n'\n"
        "  exit 0\n"
        "fi\n"
        "if [[ \"$*\" == *\"output -json route53_hosted_zone_name_servers\"* ]]; then\n"
        "  printf '[\"ns-1.awsdns.com\",\"ns-2.awsdns.net\"]\\n'\n"
        "fi\n"
        "exit 0\n",
    )

    _write_executable(
        mock_bin / "dig",
        "#!/usr/bin/env bash\n"
        "if [[ \"$2\" == \"NS\" ]]; then\n"
        "  printf 'ns-mismatch-1.example.com.\\n'\n"
        "elif [[ \"$2\" == \"A\" ]]; then\n"
        "  :\n"
        "fi\n"
        "exit 0\n",
    )

    _write_executable(
        mock_bin / "openssl",
        "#!/usr/bin/env bash\n"
        "printf 'Verification: OK\\n'\n"
        "exit 0\n",
    )

    env = _mock_env(mock_bin)
    env["AWS_REGION"] = "us-east-1"
    env["SMOKE_DNS_TIMEOUT"] = "1"
    env["SMOKE_DNS_INTERVAL"] = "1"
    env["SMOKE_TLS_TIMEOUT"] = "1"
    env["SMOKE_TLS_INTERVAL"] = "1"

    result = subprocess.run(
        ["bash", str(SMOKE_SCRIPT)],
        cwd=REPO_ROOT,
        env=env,
        capture_output=True,
        text=True,
    )

    output = result.stdout + result.stderr
    assert result.returncode == 2
    assert "[smoke] stage=dns_delegation start" in output
    assert "[smoke] stage=tls_readiness start" not in output
