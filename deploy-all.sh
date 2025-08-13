#!/bin/bash

echo "🚀 Iniciando despliegue completo del proyecto DevOps AWS"
echo "================================================"

# Crear directorio de configuración
mkdir -p config

# Ejecutar scripts en secuencia
cd scripts

echo "Paso 1: Creando bucket S3..."
chmod +x 01-create-s3-bucket.sh
./01-create-s3-bucket.sh
if [ $? -ne 0 ]; then echo "❌ Error en paso 1"; exit 1; fi

echo "Paso 2: Creando Security Group..."
chmod +x 02-create-security-group.sh
./02-create-security-group.sh
if [ $? -ne 0 ]; then echo "❌ Error en paso 2"; exit 1; fi

echo "Paso 3: Creando instancia EC2..."
chmod +x 03-create-ec2-instance.sh
./03-create-ec2-instance.sh
if [ $? -ne 0 ]; then echo "❌ Error en paso 3"; exit 1; fi

echo "Paso 4: Asignando Elastic IP..."
chmod +x 04-allocate-elastic-ip.sh
./04-allocate-elastic-ip.sh
if [ $? -ne 0 ]; then echo "❌ Error en paso 4"; exit 1; fi

echo "Esperando 60 segundos para que la instancia esté completamente lista..."
sleep 60

echo "Paso 5: Desplegando aplicación..."
chmod +x 05-deploy-app.sh
./05-deploy-app.sh
if [ $? -ne 0 ]; then echo "❌ Error en paso 5"; exit 1; fi

cd ..

echo "🎉 ¡Despliegue completo exitoso!"
echo "==============================================="
echo "📋 Resumen del despliegue:"
cat config/*.txt
