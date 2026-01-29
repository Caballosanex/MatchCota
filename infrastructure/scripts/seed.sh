#!/bin/bash
# ================================================
# Script per executar seed data a PostgreSQL
# ================================================

set -e  # Exit on error

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SQL_FILE="$SCRIPT_DIR/seed-data.sql"

echo "================================================"
echo "MatchCota - Seed Data"
echo "================================================"
echo ""

# Verificar que Docker està corrent
if ! docker ps > /dev/null 2>&1; then
    echo "❌ Error: Docker no està en marxa"
    echo "   Executa: docker-compose up -d"
    exit 1
fi

# Verificar que el contenidor db existeix
if ! docker-compose ps db | grep -q "Up"; then
    echo "❌ Error: El contenidor 'db' no està corrent"
    echo "   Executa: docker-compose up -d db"
    exit 1
fi

echo "📋 Executant seed data..."
echo ""

# Executar SQL dins del contenidor
docker-compose exec -T db psql -U postgres -d matchcota < "$SQL_FILE"

echo ""
echo "✅ Seed data executat correctament!"
echo ""
echo "================================================"
echo "CREDENCIALS DE TEST:"
echo "================================================"
echo ""
echo "Tenant: demo"
echo "  - admin@demo.com / admin123"
echo "  - maria@demo.com / admin123"
echo "  - jordi@demo.com / admin123"
echo ""
echo "Tenant: protectora-barcelona"
echo "  - admin@protectorabcn.cat / admin123"
echo "  - vet@protectorabcn.cat / admin123"
echo ""
echo "Tenant: protectora-girona"
echo "  - admin@protectoragirona.cat / admin123"
echo ""
echo "================================================"
echo "TESTING RÀPID:"
echo "================================================"
echo ""
echo "# Obtenir tenant actual"
echo 'curl -H "X-Tenant-Slug: demo" http://localhost:8000/api/v1/tenant/current'
echo ""
echo "# Llistar animals"
echo 'curl -H "X-Tenant-Slug: demo" http://localhost:8000/api/v1/animals'
echo ""
echo "# Login (quan estigui implementat)"
echo 'curl -X POST "http://localhost:8000/api/v1/auth/login" \'
echo '  -H "X-Tenant-Slug: demo" \'
echo '  -H "Content-Type: application/x-www-form-urlencoded" \'
echo '  -d "username=admin@demo.com&password=admin123"'
echo ""
echo "================================================"
