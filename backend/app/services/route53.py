"""
Route 53 DNS service for automated tenant subdomain creation.

Uses EC2 IAM instance profile (LabRole) for authentication - no explicit credentials needed.
Zone ID and Elastic IP are configured via environment variables.
"""

import os
import boto3
from botocore.exceptions import ClientError
from typing import Optional


# Read from environment (set in .env)
HOSTED_ZONE_ID = os.getenv("ROUTE53_ZONE_ID", "Z068386214DXGZ36CDSRY")
ELASTIC_IP = os.getenv("ELASTIC_IP", "")  # Set during deployment
DOMAIN_NAME = os.getenv("WILDCARD_DOMAIN", "matchcota.tech")


def get_route53_client():
    """Get boto3 Route 53 client using IAM instance profile."""
    return boto3.client('route53', region_name='us-east-1')


def create_tenant_dns_record(tenant_slug: str, elastic_ip: Optional[str] = None) -> dict:
    """
    Creates Route 53 A record for new tenant subdomain.

    Args:
        tenant_slug: Tenant identifier (e.g., "protectora-barcelona")
        elastic_ip: EC2 Elastic IP address (uses env var if not provided)

    Returns:
        dict with status and details

    Example:
        result = create_tenant_dns_record("protectora-barcelona")
        # Creates: protectora-barcelona.matchcota.tech -> Elastic IP
    """
    ip = elastic_ip or ELASTIC_IP
    if not ip:
        return {
            "success": False,
            "error": "ELASTIC_IP not configured",
            "record": None
        }

    fqdn = f"{tenant_slug}.{DOMAIN_NAME}"
    route53 = get_route53_client()

    try:
        response = route53.change_resource_record_sets(
            HostedZoneId=HOSTED_ZONE_ID,
            ChangeBatch={
                'Comment': f'Create A record for tenant {tenant_slug}',
                'Changes': [
                    {
                        'Action': 'UPSERT',  # Creates or updates
                        'ResourceRecordSet': {
                            'Name': fqdn,
                            'Type': 'A',
                            'TTL': 300,
                            'ResourceRecords': [
                                {'Value': ip}
                            ]
                        }
                    }
                ]
            }
        )

        change_id = response['ChangeInfo']['Id']
        status = response['ChangeInfo']['Status']

        return {
            "success": True,
            "error": None,
            "record": {
                "fqdn": fqdn,
                "ip": ip,
                "change_id": change_id,
                "status": status
            }
        }

    except ClientError as e:
        error_code = e.response['Error']['Code']
        error_message = e.response['Error']['Message']
        return {
            "success": False,
            "error": f"{error_code}: {error_message}",
            "record": None
        }


def delete_tenant_dns_record(tenant_slug: str, elastic_ip: Optional[str] = None) -> dict:
    """
    Deletes Route 53 A record for tenant subdomain.

    Args:
        tenant_slug: Tenant identifier
        elastic_ip: EC2 Elastic IP address (required to match existing record)

    Returns:
        dict with status and details
    """
    ip = elastic_ip or ELASTIC_IP
    if not ip:
        return {
            "success": False,
            "error": "ELASTIC_IP not configured",
            "record": None
        }

    fqdn = f"{tenant_slug}.{DOMAIN_NAME}"
    route53 = get_route53_client()

    try:
        response = route53.change_resource_record_sets(
            HostedZoneId=HOSTED_ZONE_ID,
            ChangeBatch={
                'Comment': f'Delete A record for tenant {tenant_slug}',
                'Changes': [
                    {
                        'Action': 'DELETE',
                        'ResourceRecordSet': {
                            'Name': fqdn,
                            'Type': 'A',
                            'TTL': 300,
                            'ResourceRecords': [
                                {'Value': ip}
                            ]
                        }
                    }
                ]
            }
        )

        return {
            "success": True,
            "error": None,
            "record": {"fqdn": fqdn, "action": "deleted"}
        }

    except ClientError as e:
        return {
            "success": False,
            "error": str(e),
            "record": None
        }


def check_dns_propagation(tenant_slug: str) -> dict:
    """
    Check if DNS record has propagated (basic check via Route 53 API).

    Note: This checks Route 53's view, not global DNS propagation.
    Full propagation may take 5-15 minutes.
    """
    fqdn = f"{tenant_slug}.{DOMAIN_NAME}"
    route53 = get_route53_client()

    try:
        response = route53.list_resource_record_sets(
            HostedZoneId=HOSTED_ZONE_ID,
            StartRecordName=fqdn,
            StartRecordType='A',
            MaxItems='1'
        )

        records = response.get('ResourceRecordSets', [])
        if records and records[0]['Name'].rstrip('.') == fqdn:
            return {
                "exists": True,
                "record": records[0]
            }

        return {"exists": False, "record": None}

    except ClientError as e:
        return {"exists": False, "error": str(e)}
