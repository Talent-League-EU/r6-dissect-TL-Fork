from flask import Flask

app = Flask(__name__)

@app.route('/HealthCheck', methods=['GET'])
def health_check():
    return 'OK', 200

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=80)