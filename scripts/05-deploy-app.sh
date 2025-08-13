#!/bin/bash

# Cargar configuración
source ../config/instance-config.txt
source ../config/elastic-ip-config.txt

KEY_PATH="../config/devops-project-key.pem"

echo "🚀 Desplegando aplicación en EC2..."
echo "IP: $ELASTIC_IP"

# Esperar a que SSH esté disponible
echo "⏳ Esperando que SSH esté disponible..."
while ! nc -z $ELASTIC_IP 22; do   
    sleep 5
done

# Copiar archivos de la aplicación
echo "📁 Copiando archivos de la aplicación..."
scp -i $KEY_PATH -o StrictHostKeyChecking=no -r ../app/* ec2-user@$ELASTIC_IP:/tmp/

# Conectar y configurar
echo "⚙️ Configurando aplicación en el servidor..."
ssh -i $KEY_PATH -o StrictHostKeyChecking=no ec2-user@$ELASTIC_IP << 'EOF'
    # Mover archivos a directorio de la app
    sudo cp -r /tmp/* /opt/devops-app/
    sudo chown -R ec2-user:ec2-user /opt/devops-app
    
    # Instalar dependencias
    cd /opt/devops-app
    pip3 install --user -r requirements.txt
    
    # Iniciar servicio
    sudo systemctl start devops-app
    sudo systemctl status devops-app
    
    echo "✅ Aplicación desplegada y ejecutándose"
EOF

if [ $? -eq 0 ]; then
    echo "🎉 ¡Despliegue completado exitosamente!"
    echo "🌐 Aplicación disponible en: http://$ELASTIC_IP"
    echo "📊 API Status: http://$ELASTIC_IP/api/status"
    echo "📋 API Info: http://$ELASTIC_IP/api/info"
else
    echo "❌ Error en el despliegue"
    exit 1
fi