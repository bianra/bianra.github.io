import os
from flask import Flask, jsonify, request
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy

app = Flask(__name__)
CORS(app)

app.config['SQLALCHEMY_DATABASE_URI'] = os.environ.get('DATABASE_URL', 'sqlite:///messages.db')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db = SQLAlchemy(app)

class Message(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    content = db.Column(db.Text, nullable=False)
    likes = db.Column(db.Integer, default=0)
    created_at = db.Column(db.DateTime, default=db.func.current_timestamp())

class Profile(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(50), default="我的个人主页")
    bio = db.Column(db.Text, default="这是一段关于我的介绍。在这里你可以记录心情，留下印记。欢迎大家留言互动！")
    announcement = db.Column(db.Text, default="欢迎来到 bianra 的小屋！\n这里是一个自由留言的空间。\n点击头像可以编辑主页信息。")

@app.route('/api/messages', methods=['GET'])
def get_messages():
    messages = Message.query.order_by(Message.created_at.desc()).all()
    return jsonify([{
        'id': m.id,
        'content': m.content,
        'likes': m.likes,
        'display_likes': '99+' if m.likes > 99 else str(m.likes),
        'created_at': m.created_at.strftime('%Y-%m-%d %H:%M')
    } for m in messages])

@app.route('/api/messages', methods=['POST'])
def create_message():
    data = request.get_json()
    content = data.get('content')
    
    if not content:
        return jsonify({'error': '内容不能为空'}), 400
    
    message = Message(content=content)
    db.session.add(message)
    db.session.commit()
    
    return jsonify({
        'id': message.id,
        'content': message.content,
        'likes': message.likes,
        'display_likes': '99+' if message.likes > 99 else str(message.likes),
        'created_at': message.created_at.strftime('%Y-%m-%d %H:%M')
    }), 201

@app.route('/api/messages/<int:message_id>/like', methods=['POST'])
def like_message(message_id):
    message = Message.query.get_or_404(message_id)
    message.likes += 1
    db.session.commit()
    
    return jsonify({
        'id': message.id,
        'likes': message.likes,
        'display_likes': '99+' if message.likes > 99 else str(message.likes)
    })

@app.route('/api/messages/<int:message_id>', methods=['DELETE'])
def delete_message(message_id):
    message = Message.query.get_or_404(message_id)
    db.session.delete(message)
    db.session.commit()
    
    return jsonify({'message': '删除成功'})

@app.route('/api/profile', methods=['GET'])
def get_profile():
    profile = Profile.query.first()
    if not profile:
        profile = Profile()
        db.session.add(profile)
        db.session.commit()
    
    return jsonify({
        'name': profile.name,
        'bio': profile.bio,
        'announcement': profile.announcement
    })

@app.route('/api/profile', methods=['POST'])
def update_profile():
    data = request.get_json()
    password = data.get('password')
    
    if password != '200709':
        return jsonify({'error': '密码错误'}), 401
    
    profile = Profile.query.first()
    if not profile:
        profile = Profile()
        db.session.add(profile)
    
    profile.name = data.get('name', profile.name)
    profile.bio = data.get('bio', profile.bio)
    profile.announcement = data.get('announcement', profile.announcement)
    
    db.session.commit()
    
    return jsonify({
        'name': profile.name,
        'bio': profile.bio,
        'announcement': profile.announcement
    })

if __name__ == '__main__':
    with app.app_context():
        db.create_all()
    app.run(debug=True)
