#!/bin/bash

echo "🔍 Validando despliegue del proyecto AWS DevOps..."
echo "=================================================="

# Colores para output
RED="\033[0;31m"
GREEN="\033[0;32m"
YELLOW="\033[1;33m"
NC="\033[0m" # No Color

# Contadores
PASSED=0
FAILED=0

# Función para validar un test
validate_test() {
    local test_name="$1"
    local command="$2"
    
    echo -n "Validando $test_name... "
    
    if eval "$command" >/dev/null 2>&1; then
        echo -e "${GREEN}✅ PASSED${NC}"
        ((PASSED++))
        return 0
    else
        echo -e "${RED}❌ FAILED${NC}"
        ((FAILED++))
        return 1
    fi
}

echo "🔧 Validaciones de Configuración"
echo "--------------------------------"

# Validar AWS CLI
validate_test "AWS CLI instalado" "aws --version"
validate_test "AWS credenciales configuradas" "aws sts get-caller-identity"

echo ""
echo "📊 Resumen de Validación"
echo "========================"
echo -e "Tests pasados: ${GREEN}$PASSED${NC}"
echo -e "Tests fallidos: ${RED}$FAILED${NC}"

if [ $FAILED -eq 0 ]; then
    echo -e "\n🎉 ${GREEN}¡Validación inicial exitosa!${NC}"
else
    echo -e "\n⚠️ ${YELLOW}Revisar configuración AWS CLI.${NC}"
fi
