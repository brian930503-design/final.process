from flask import Flask, render_template, jsonify, request, session, redirect, url_for
from functools import wraps
import sqlite3
import os

app = Flask(__name__)
app.secret_key = 'smart_closet_secret_key'

DATABASE = 'database.db'

def get_db():
    conn = sqlite3.connect(DATABASE)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    with get_db() as conn:
        c = conn.cursor()
        c.execute('''CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT, 
            username TEXT UNIQUE, 
            password TEXT)''')
        c.execute('''CREATE TABLE IF NOT EXISTS clothes (
            id INTEGER PRIMARY KEY AUTOINCREMENT, 
            user_id INTEGER, 
            name TEXT, 
            category TEXT, 
            color TEXT, 
            style TEXT, 
            FOREIGN KEY(user_id) REFERENCES users(id))''')
        c.execute('''CREATE TABLE IF NOT EXISTS diaries (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            rating INTEGER,
            feedback TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(user_id) REFERENCES users(id))''')
        conn.commit()

# Ensure DB is created before first request
with app.app_context():
    init_db()

# Mock Data for Dashboard Status
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

def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'user_id' not in session:
            return redirect(url_for('auth'))
        return f(*args, **kwargs)
    return decorated_function

@app.route('/auth', methods=['GET', 'POST'])
def auth():
    if request.method == 'POST':
        action = request.form.get('action')
        username = request.form.get('username')
        password = request.form.get('password')
        
        with get_db() as conn:
            c = conn.cursor()
            if action == 'register':
                if not username or not password:
                    return render_template('auth.html', error='請填寫帳號與密碼。', active_tab='register')
                try:
                    c.execute("INSERT INTO users (username, password) VALUES (?, ?)", (username, password))
                    conn.commit()
                    user_id = c.lastrowid
                    session['user_id'] = user_id
                    session['username'] = username
                    return redirect(url_for('index'))
                except sqlite3.IntegrityError:
                    return render_template('auth.html', error='帳號已存在，請更換帳號。', active_tab='register')
                
            elif action == 'login':
                user = c.execute("SELECT * FROM users WHERE username = ? AND password = ?", (username, password)).fetchone()
                if user:
                    session['user_id'] = user['id']
                    session['username'] = user['username']
                    return redirect(url_for('index'))
                else:
                    return render_template('auth.html', error='帳號或密碼錯誤。', active_tab='login')
                
    return render_template('auth.html', active_tab='login')

@app.route('/logout')
def logout():
    session.clear()
    return redirect(url_for('auth'))

@app.route('/')
@login_required
def index():
    return render_template('dashboard.html', data=dashboard_data, username=session.get('username'))

@app.route('/settings')
@login_required
def settings():
    return render_template('settings.html', username=session.get('username'), data=dashboard_data)

@app.route('/diary')
@login_required
def diary():
    with get_db() as conn:
        c = conn.cursor()
        diaries = c.execute("SELECT * FROM diaries WHERE user_id = ? ORDER BY created_at DESC", (session['user_id'],)).fetchall()
    return render_template('diary.html', username=session.get('username'), diaries=[dict(d) for d in diaries])

@app.route('/api/change_password', methods=['POST'])
@login_required
def change_password():
    data = request.json
    old_password = data.get('old_password')
    new_password = data.get('new_password')
    
    with get_db() as conn:
        c = conn.cursor()
        user = c.execute("SELECT * FROM users WHERE id = ? AND password = ?", (session['user_id'], old_password)).fetchone()
        if user:
            c.execute("UPDATE users SET password = ? WHERE id = ?", (new_password, session['user_id']))
            conn.commit()
            return jsonify({'status': 'success', 'message': '密碼修改成功，即將為您登出...'})
        else:
            return jsonify({'status': 'error', 'message': '舊密碼錯誤。'})

@app.route('/api/status')
@login_required
def get_status():
    return jsonify(dashboard_data)

@app.route('/api/clothes', methods=['GET'])
@login_required
def get_clothes():
    q = request.args.get('q', '')
    with get_db() as conn:
        c = conn.cursor()
        if q:
            clothes = c.execute("SELECT * FROM clothes WHERE user_id = ? AND name LIKE ?", (session['user_id'], f"%{q}%")).fetchall()
        else:
            clothes = c.execute("SELECT * FROM clothes WHERE user_id = ?", (session['user_id'],)).fetchall()
        
    return jsonify({'status': 'success', 'data': [dict(item) for item in clothes]})

@app.route('/api/clothes/add', methods=['POST'])
@login_required
def add_clothes():
    data = request.json
    name = data.get('name')
    category = data.get('category')
    color = data.get('color')
    style = data.get('style')
    
    with get_db() as conn:
        c = conn.cursor()
        c.execute("INSERT INTO clothes (user_id, name, category, color, style) VALUES (?, ?, ?, ?, ?)",
                  (session['user_id'], name, category, color, style))
        conn.commit()
    return jsonify({'status': 'success', 'message': '衣物新增成功'})

@app.route('/api/clothes/update', methods=['POST'])
@login_required
def update_clothes():
    data = request.json
    item_id = data.get('id')
    name = data.get('name')
    category = data.get('category')
    color = data.get('color')
    style = data.get('style')
    
    with get_db() as conn:
        c = conn.cursor()
        c.execute("UPDATE clothes SET name=?, category=?, color=?, style=? WHERE id=? AND user_id=?",
                  (name, category, color, style, item_id, session['user_id']))
        conn.commit()
    return jsonify({'status': 'success', 'message': '衣物修改成功'})

@app.route('/api/clothes/delete', methods=['POST'])
@login_required
def delete_clothes():
    data = request.json
    item_id = data.get('id')
    with get_db() as conn:
        c = conn.cursor()
        c.execute("DELETE FROM clothes WHERE id=? AND user_id=?", (item_id, session['user_id']))
        conn.commit()
    return jsonify({'status': 'success', 'message': '衣物已刪除'})

@app.route('/api/action/dehumidify', methods=['POST'])
@login_required
def action_dehumidify():
    return jsonify({'status': 'success', 'message': '已手動啟動除濕功能。'})

@app.route('/api/action/uvc', methods=['POST'])
@login_required
def action_uvc():
    return jsonify({'status': 'success', 'message': '已手動啟動 UVC 殺菌功能。'})

@app.route('/api/custom_recommendation', methods=['POST'])
@login_required
def custom_recommendation():
    data = request.json
    color = data.get('color', '')
    style = data.get('style', '')
    category = data.get('category', '')
    new_top = f"{color}{style}{category}" if color or style or category else "灰色長袖帽 T"
    custom_outfit = {
        'top': new_top,
        'bottom': '黑色工作褲',
        'shoes': '運動鞋'
    }
    dashboard_data['recommendation'] = custom_outfit
    return jsonify({'status': 'success', 'recommendation': custom_outfit})

@app.route('/api/satisfaction', methods=['POST'])
@login_required
def record_satisfaction():
    data = request.json
    rating = data.get('rating')
    feedback = data.get('feedback')
    with get_db() as conn:
        c = conn.cursor()
        c.execute("INSERT INTO diaries (user_id, rating, feedback) VALUES (?, ?, ?)", (session['user_id'], rating, feedback))
        conn.commit()
    return jsonify({'status': 'success', 'message': '感謝您的回饋，滿意度已記錄！'})

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
