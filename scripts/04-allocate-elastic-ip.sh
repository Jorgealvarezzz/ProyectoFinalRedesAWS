#!/bin/bash

# Cargar configuración
source ../config/instance-config.txt

echo "🌐 Asignando Elastic IP..."

# Asignar Elastic IP
ALLOCATION_ID=$(aws ec2 allocate-address --domain vpc --query 'AllocationId' --output text)

if [ $? -eq 0 ]; then
    echo "✅ Elastic IP asignada: $ALLOCATION_ID"
    
    # Asociar con la instancia
    ASSOCIATION_ID=$(aws ec2 associate-address \
        --instance-id $INSTANCE_ID \
        --allocation-id $ALLOCATION_ID \
        --query 'AssociationId' \
        --output text)
    
    if [ $? -eq 0 ]; then
        # Obtener la nueva IP elástica
        ELASTIC_IP=$(aws ec2 describe-addresses \
            --allocation-ids $ALLOCATION_ID \
            --query 'Addresses[0].PublicIp' \
            --output text)
        
        echo "✅ IP Elástica asociada: $ELASTIC_IP"
        echo "ELASTIC_IP=$ELASTIC_IP" > ../config/elastic-ip-config.txt
        echo "ALLOCATION_ID=$ALLOCATION_ID" >> ../config/elastic-ip-config.txt
        echo "ASSOCIATION_ID=$ASSOCIATION_ID" >> ../config/elastic-ip-config.txt
        
    else
        echo "❌ Error al asociar IP elástica"
        exit 1
    fi
else
    echo "❌ Error al asignar IP elástica"
    exit 1
fi