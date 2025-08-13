# Proyecto Final AWS - Guía Completa

## 📋 Preparativos Iniciales

### 1. Configurar AWS CLI
```bash
# Instalar AWS CLI (si no lo tienes)
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip
sudo ./aws/install

# Configurar credenciales
aws configure
# AWS Access Key ID: [tu-access-key]
# AWS Secret Access Key: [tu-secret-key]
# Default region name: us-east-1
# Default output format: json
```

### 2. Estructura del Proyecto
```
aws-devops-project/
├── app/
│   ├── app.py
│   ├── requirements.txt
│   └── templates/
│       └── index.html
├── scripts/
│   ├── 01-create-s3-bucket.sh
│   ├── 02-create-security-group.sh
│   ├── 03-create-ec2-instance.sh
│   ├── 04-allocate-elastic-ip.sh
│   ├── 05-deploy-app.sh
│   └── cleanup.sh
├── docs/
│   └── deployment-evidence/
└── README.md
```

## 🚀 Paso 1: Crear la Aplicación Web

### Aplicación Python (Flask)
Archivo: `app/app.py`

```python
from flask import Flask, render_template, jsonify
import datetime
import os

app = Flask(__name__)

@app.route('/')
def home():
    return render_template('index.html')

@app.route('/api/status')
def status():
    return jsonify({
        'status': 'running',
        'timestamp': datetime.datetime.now().isoformat(),
        'server': 'AWS EC2 Instance',
        'message': 'DevOps Project - AWS CLI Deployment'
    })

@app.route('/api/info')
def info():
    return jsonify({
        'project': 'AWS DevOps Final Project',
        'technology': 'Flask + AWS CLI',
        'instance_id': os.environ.get('INSTANCE_ID', 'unknown'),
        'region': 'us-east-1'
    })

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=80, debug=True)
```

### Template HTML
Archivo: `app/templates/index.html`

```html
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>AWS DevOps Project</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            max-width: 800px;
            margin: 50px auto;
            padding: 20px;
            background-color: #f5f5f5;
        }
        .container {
            background: white;
            padding: 30px;
            border-radius: 10px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        h1 { color: #232F3E; }
        .status { background: #4CAF50; color: white; padding: 10px; border-radius: 5px; }
        .api-endpoint { background: #f9f9f9; padding: 15px; margin: 10px 0; border-left: 4px solid #FF9900; }
        button {
            background: #FF9900;
            color: white;
            border: none;
            padding: 10px 20px;
            border-radius: 5px;
            cursor: pointer;
            margin: 5px;
        }
        button:hover { background: #e88900; }
        #response { background: #f0f0f0; padding: 15px; margin-top: 20px; border-radius: 5px; }
    </style>
</head>
<body>
    <div class="container">
        <h1>🚀 AWS DevOps Final Project</h1>
        <div class="status">✅ Aplicación desplegada exitosamente en AWS EC2</div>
        
        <h2>Información del Proyecto</h2>
        <ul>
            <li><strong>Tecnología:</strong> Flask + Python</li>
            <li><strong>Infraestructura:</strong> AWS EC2, S3, Elastic IP</li>
            <li><strong>Automatización:</strong> AWS CLI Scripts</li>
            <li><strong>Repositorio:</strong> GitHub</li>
        </ul>
        
        <h2>API Endpoints</h2>
        <div class="api-endpoint">
            <strong>GET /api/status</strong> - Estado del servidor
            <button onclick="testAPI('/api/status')">Probar</button>
        </div>
        <div class="api-endpoint">
            <strong>GET /api/info</strong> - Información del proyecto
            <button onclick="testAPI('/api/info')">Probar</button>
        </div>
        
        <div id="response"></div>
    </div>
    
    <script>
        function testAPI(endpoint) {
            fetch(endpoint)
                .then(response => response.json())
                .then(data => {
                    document.getElementById('response').innerHTML = 
                        '<h3>Respuesta de ' + endpoint + ':</h3><pre>' + 
                        JSON.stringify(data, null, 2) + '</pre>';
                })
                .catch(error => {
                    document.getElementById('response').innerHTML = 
                        '<h3>Error:</h3><p>' + error + '</p>';
                });
        }
    </script>
</body>
</html>
```

### Dependencias
Archivo: `app/requirements.txt`

```
Flask==2.3.3
Werkzeug==2.3.7
```

## 🛠️ Paso 2: Scripts de AWS CLI

### Script 1: Crear S3 Bucket
Archivo: `scripts/01-create-s3-bucket.sh`

```bash
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
    echo "BUCKET_NAME=$BUCKET_NAME" > ../config/bucket-config.txt
    
    # Subir archivo de ejemplo
    echo "Subiendo archivo de ejemplo..."
    echo "Deployment $(date)" > deployment-log.txt
    aws s3 cp deployment-log.txt s3://$BUCKET_NAME/logs/
    
    # Listar contenido
    echo "📁 Contenido del bucket:"
    aws s3 ls s3://$BUCKET_NAME --recursive
    
else
    echo "❌ Error al crear el bucket"
    exit 1
fi
```

### Script 2: Crear Security Group
Archivo: `scripts/02-create-security-group.sh`

```bash
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
```

### Script 3: Crear Instancia EC2
Archivo: `scripts/03-create-ec2-instance.sh`

```bash
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
```

### Script 4: Asignar Elastic IP
Archivo: `scripts/04-allocate-elastic-ip.sh`

```bash
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
```

### Script 5: Desplegar Aplicación
Archivo: `scripts/05-deploy-app.sh`

```bash
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
```

### Script de Limpieza
Archivo: `scripts/cleanup.sh`

```bash
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
```

## 🎯 Paso 3: Script Principal de Despliegue

Archivo: `deploy-all.sh`

```bash
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
```

## 📚 Instrucciones de Uso

1. **Clonar o crear el repositorio:**
```bash
git clone <tu-repositorio>
cd aws-devops-project
```

2. **Configurar AWS CLI:**
```bash
aws configure
```

3. **Ejecutar despliegue completo:**
```bash
chmod +x deploy-all.sh
./deploy-all.sh
```

4. **Acceder a la aplicación:**
   - URL: `http://[ELASTIC-IP]`
   - API Status: `http://[ELASTIC-IP]/api/status`
   - API Info: `http://[ELASTIC-IP]/api/info`

5. **Limpiar recursos:**
```bash
cd scripts
chmod +x cleanup.sh
./cleanup.sh
```

## 📝 Notas Importantes

- Todos los recursos utilizan el Free Tier de AWS
- La aplicación se ejecuta en puerto 80
- Los logs se almacenan en S3
- La instancia usa Amazon Linux 2
- SSH disponible en puerto 22

## 🔍 Verificación

Para verificar que todo funciona correctamente:

```bash
# Verificar bucket S3
aws s3 ls

# Verificar instancia EC2
aws ec2 describe-instances --query 'Reservations[].Instances[].[InstanceId,State.Name,PublicIpAddress]' --output table

# Verificar Security Groups
aws ec2 describe-security-groups --query 'SecurityGroups[].[GroupName,GroupId]' --output table

# Probar aplicación
curl http://[ELASTIC-IP]/api/status
```
