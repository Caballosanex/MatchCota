#!/bin/bash
# ================================================
# Script per resetejar la base de dades
# ATENCIÓ: Esborra TOTES les dades!
# ================================================

set -e

echo "================================================"
echo "⚠️  RESET DATABASE ⚠️"
echo "================================================"
echo ""
echo "Aquest script esborrarà TOTES les dades de la BD"
echo "i tornarà a aplicar les migracions."
echo ""
read -p "Estàs segur? (escriu 'yes' per confirmar): " confirm

if [ "$confirm" != "yes" ]; then
    echo "❌ Cancel·lat"
    exit 0
fi

echo ""
echo "📋 Eliminant totes les taules..."

# Esborrar totes les taules
docker-compose exec -T db psql -U postgres -d matchcota <<EOF
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;
GRANT ALL ON SCHEMA public TO postgres;
GRANT ALL ON SCHEMA public TO public;
EOF

echo "✅ Taules esborrades"
echo ""
echo "📋 Aplicant migracions..."

# Tornar a aplicar migracions
docker-compose exec backend alembic upgrade head

echo "✅ Migracions aplicades"
echo ""
echo "📋 Executant seed data..."

# Executar seed
./infrastructure/scripts/seed.sh

echo ""
echo "✅ Base de dades resetejada correctament!"
