#!/usr/bin/env python3

import argparse
import json
import sys
from pathlib import Path


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Validate monthly Terraform cost estimate against a USD threshold."
    )
    parser.add_argument("--max-usd", type=float, default=50.0, help="Maximum monthly budget in USD")
    parser.add_argument("--input", required=True, help="Path to estimate JSON file")
    return parser.parse_args()


def load_estimate(path: Path) -> dict:
    with path.open("r", encoding="utf-8") as f:
        return json.load(f)


def compute_monthly_total(estimate: dict) -> float:
    line_items = estimate.get("line_items", [])
    if not isinstance(line_items, list):
        raise ValueError("line_items must be a list")

    computed_total = 0.0
    for item in line_items:
        if not isinstance(item, dict):
            raise ValueError("each line_items entry must be an object")
        monthly_cost = item.get("monthly_usd", 0)
        computed_total += float(monthly_cost)

    if "monthly_total_usd" in estimate:
        declared_total = float(estimate["monthly_total_usd"])
        if abs(declared_total - computed_total) > 0.01:
            raise ValueError(
                f"monthly_total_usd ({declared_total}) does not match sum(line_items) ({computed_total:.2f})"
            )
        return declared_total

    return round(computed_total, 2)


def main() -> int:
    args = parse_args()
    threshold = float(args.max_usd)
    estimate_path = Path(args.input)

    if not estimate_path.exists():
        print(f"status=error message=input_file_not_found path={estimate_path}")
        return 2

    try:
        estimate = load_estimate(estimate_path)
        monthly_total = compute_monthly_total(estimate)
    except (json.JSONDecodeError, ValueError, TypeError) as exc:
        print(f"status=error message=invalid_estimate reason={exc}")
        return 2

    print(f"monthly_total_usd={monthly_total:.2f}")
    print(f"threshold_usd={threshold:.2f}")

    if monthly_total <= threshold:
        print("status=pass")
        return 0

    print("status=fail")
    return 1


if __name__ == "__main__":
    sys.exit(main())
