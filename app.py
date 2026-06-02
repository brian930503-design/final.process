from flask import Flask, render_template, jsonify

app = Flask(__name__)

# Mock Data
dashboard_data = {
    'temperature': 25.4,
    'humidity': 68,
    'uvc_status': 'OFF',
    'weather': {
        'condition': '晴天',
        'temp_high': 28,
        'temp_low': 22
    },
    'recommendation': {
        'top': '白色短袖 T 恤',
        'bottom': '淺色牛仔褲',
        'shoes': '休閒帆布鞋'
    }
}

clothes_data = {
    'labels': ['短袖 T 恤', '長袖襯衫', '長褲', '短褲', '外套', '洋裝'],
    'data': [15, 8, 10, 5, 4, 3]
}

@app.route('/')
def index():
    return render_template('dashboard.html', data=dashboard_data)

@app.route('/api/status')
def get_status():
    return jsonify(dashboard_data)

@app.route('/api/clothes')
def get_clothes():
    return jsonify(clothes_data)

@app.route('/api/action/dehumidify', methods=['POST'])
def action_dehumidify():
    # Toggle or simply start dehumidification
    return jsonify({'status': 'success', 'message': '已手動啟動除濕功能。'})

@app.route('/api/action/uvc', methods=['POST'])
def action_uvc():
    return jsonify({'status': 'success', 'message': '已手動啟動 UVC 殺菌功能。'})

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
