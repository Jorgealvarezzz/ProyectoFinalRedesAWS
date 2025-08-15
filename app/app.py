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
    app.run(host='0.0.0.0', port=5000, debug=False)
@app.route('/jugadores')
def jugadores():
    return render_template('jugadores.html')

@app.route('/live') 
def live():
    return render_template('live.html')

@app.route('/partido')
def partido():
    return render_template('partido.html')

@app.route('/reportes')
def reportes():
    return render_template('reportes.html')

# Para servir archivos CSS y JS
@app.route('/styles.css')
def styles():
    return send_from_directory('templates', 'styles.css')

@app.route('/<filename>.js')
def js_files(filename):
    return send_from_directory('templates', f'{filename}.js')
