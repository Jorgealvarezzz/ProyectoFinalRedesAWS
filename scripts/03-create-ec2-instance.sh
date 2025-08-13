#!/bin/bash

# Variables
INSTANCE_TYPE="t2.micro"
AMI_ID="ami-0c55b159cbfafe1d0"  # Amazon Linux 2 (verificar AMI actual)
KEY_NAME="devops-project-key"

# Cargar configuración
source ../config/sg-config.txt

echo "🖥️ Creando instancia EC2..."

# Crear par de llaves si no existe
if ! aws ec2 describe-key-pairs --key-names $KEY_NAME &>/dev/null; then
    echo "🔑 Creando par de llaves..."
    aws ec2 create-key-pair --key-name $KEY_NAME --query 'KeyMaterial' --output text > ../config/$KEY_NAME.pem
    chmod 400 ../config/$KEY_NAME.pem
    echo "✅ Par de llaves creado: $KEY_NAME"
fi

# Obtener AMI ID más reciente de Amazon Linux 2
AMI_ID=$(aws ec2 describe-images \
    --owners amazon \
    --filters "Name=name,Values=amzn2-ami-hvm-*-x86_64-gp2" \
    --query 'Images | sort_by(@, &CreationDate) | [-1].ImageId' \
    --output text)

echo "🔍 Usando AMI: $AMI_ID"

# User Data Script para instalar dependencias
USER_DATA='#!/bin/bash
yum update -y
yum install -y python3 python3-pip git
pip3 install flask
mkdir -p /opt/devops-app
cd /opt/devops-app

# Crear servicio systemd
cat > /etc/systemd/system/devops-app.service << EOF
[Unit]
Description=DevOps Flask App
After=network.target

[Service]
Type=simple
User=ec2-user
WorkingDirectory=/opt/devops-app
Environment=INSTANCE_ID=$(curl -s http://169.254.169.254/latest/meta-data/instance-id)
ExecStart=/usr/bin/python3 app.py
Restart=always

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable devops-app
'

# Crear instancia
INSTANCE_ID=$(aws ec2 run-instances \
    --image-id $AMI_ID \
    --count 1 \
    --instance-type $INSTANCE_TYPE \
    --key-name $KEY_NAME \
    --security-group-ids $SG_ID \
    --user-data "$USER_DATA" \
    --tag-specifications 'ResourceType=instance,Tags=[{Key=Name,Value=DevOps-Project-Instance}]' \
    --query 'Instances[0].InstanceId' \
    --output text)

if [ $? -eq 0 ]; then
    echo "✅ Instancia creada: $INSTANCE_ID"
    echo "INSTANCE_ID=$INSTANCE_ID" > ../config/instance-config.txt
    
    # Esperar a que la instancia esté running
    echo "⏳ Esperando que la instancia esté en estado 'running'..."
    aws ec2 wait instance-running --instance-ids $INSTANCE_ID
    
    # Obtener IP pública
    PUBLIC_IP=$(aws ec2 describe-instances \
        --instance-ids $INSTANCE_ID \
        --query 'Reservations[0].Instances[0].PublicIpAddress' \
        --output text)
    
    echo "🌐 IP Pública: $PUBLIC_IP"
    echo "PUBLIC_IP=$PUBLIC_IP" >> ../config/instance-config.txt
    
else
    echo "❌ Error al crear la instancia"
    exit 1
fi