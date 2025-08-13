#!/bin/bash

# Variables
BUCKET_NAME="devops-project-$(date +%s)-$(whoami)"
REGION="us-east-1"

echo "🪣 Creando bucket S3: $BUCKET_NAME"

# Crear bucket S3
aws s3 mb s3://$BUCKET_NAME --region $REGION

# Verificar creación
if [ $? -eq 0 ]; then
    echo "✅ Bucket creado exitosamente: $BUCKET_NAME"
    
    # Guardar nombre del bucket para otros scripts
    mkdir -p config
    echo "BUCKET_NAME=$BUCKET_NAME" > config/bucket-config.txt
    
    # Subir archivo de ejemplo
    echo "Subiendo archivo de ejemplo..."
    echo "Deployment $(date)" > deployment-log.txt
    aws s3 cp deployment-log.txt s3://$BUCKET_NAME/logs/
    rm deployment-log.txt
    
    # Listar contenido
    echo "📁 Contenido del bucket:"
    aws s3 ls s3://$BUCKET_NAME --recursive
    
else
    echo "❌ Error al crear el bucket"
    exit 1
fi
