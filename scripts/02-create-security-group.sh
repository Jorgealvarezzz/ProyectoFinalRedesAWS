#!/bin/bash

# Variables
SG_NAME="devops-project-sg"
SG_DESCRIPTION="Security Group for DevOps Project"
VPC_ID=$(aws ec2 describe-vpcs --filters "Name=isDefault,Values=true" --query 'Vpcs[0].VpcId' --output text)

echo "🔐 Creando Security Group: $SG_NAME"
echo "VPC ID: $VPC_ID"

# Crear Security Group
SG_ID=$(aws ec2 create-security-group \
    --group-name $SG_NAME \
    --description "$SG_DESCRIPTION" \
    --vpc-id $VPC_ID \
    --query 'GroupId' \
    --output text)

if [ $? -eq 0 ]; then
    echo "✅ Security Group creado: $SG_ID"
    
    # Agregar reglas
    echo "📝 Agregando reglas de seguridad..."
    
    # SSH (puerto 22)
    aws ec2 authorize-security-group-ingress \
        --group-id $SG_ID \
        --protocol tcp \
        --port 22 \
        --cidr 0.0.0.0/0
    
    # HTTP (puerto 80)
    aws ec2 authorize-security-group-ingress \
        --group-id $SG_ID \
        --protocol tcp \
        --port 80 \
        --cidr 0.0.0.0/0
    
    # HTTPS (puerto 443)
    aws ec2 authorize-security-group-ingress \
        --group-id $SG_ID \
        --protocol tcp \
        --port 443 \
        --cidr 0.0.0.0/0
    
    echo "✅ Reglas agregadas exitosamente"
    
    # Guardar ID del Security Group
    mkdir -p ../config
    echo "SG_ID=$SG_ID" > ../config/sg-config.txt
    
    # Mostrar reglas
    echo "📋 Reglas del Security Group:"
    aws ec2 describe-security-groups --group-ids $SG_ID --query 'SecurityGroups[0].IpPermissions'
    
else
    echo "❌ Error al crear Security Group"
    exit 1
fi