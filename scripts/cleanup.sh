#!/bin/bash

echo "🧹 Limpiando recursos AWS..."

# Cargar configuraciones
if [ -f ../config/instance-config.txt ]; then
    source ../config/instance-config.txt
fi

if [ -f ../config/elastic-ip-config.txt ]; then
    source ../config/elastic-ip-config.txt
fi

if [ -f ../config/sg-config.txt ]; then
    source ../config/sg-config.txt
fi

if [ -f ../config/bucket-config.txt ]; then
    source ../config/bucket-config.txt
fi

# Terminar instancia EC2
if [ ! -z "$INSTANCE_ID" ]; then
    echo "🖥️ Terminando instancia: $INSTANCE_ID"
    aws ec2 terminate-instances --instance-ids $INSTANCE_ID
    aws ec2 wait instance-terminated --instance-ids $INSTANCE_ID
fi

# Liberar Elastic IP
if [ ! -z "$ASSOCIATION_ID" ]; then
    echo "🌐 Desasociando Elastic IP: $ASSOCIATION_ID"
    aws ec2 disassociate-address --association-id $ASSOCIATION_ID
fi

if [ ! -z "$ALLOCATION_ID" ]; then
    echo "🌐 Liberando Elastic IP: $ALLOCATION_ID"
    aws ec2 release-address --allocation-id $ALLOCATION_ID
fi

# Eliminar Security Group
if [ ! -z "$SG_ID" ]; then
    echo "🔐 Eliminando Security Group: $SG_ID"
    aws ec2 delete-security-group --group-id $SG_ID
fi

# Vaciar y eliminar bucket S3
if [ ! -z "$BUCKET_NAME" ]; then
    echo "🪣 Vaciando bucket: $BUCKET_NAME"
    aws s3 rm s3://$BUCKET_NAME --recursive
    echo "🪣 Eliminando bucket: $BUCKET_NAME"
    aws s3 rb s3://$BUCKET_NAME
fi

# Eliminar par de llaves
echo "🔑 Eliminando par de llaves: devops-project-key"
aws ec2 delete-key-pair --key-name devops-project-key

# Limpiar archivos de configuración
rm -f ../config/*

echo "✅ Limpieza completada"