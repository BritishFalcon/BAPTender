from flask import Flask, render_template, request
from flask_socketio import SocketIO
from flask_sqlalchemy import SQLAlchemy
import numpy as np
import time
app = Flask(__name__)
socketio = SocketIO(app)
app.config['SQLALCHEMY_DATABASE_URI'] = 'mysql://root:password@localhost/main'
db = SQLAlchemy(app)


class Drinks(db.Model):
    ID = db.Column(db.Integer, primary_key=True, autoincrement=True)
    User = db.Column(db.String(50), nullable=False)
    Time = db.Column(db.DateTime, default=db.func.current_timestamp())
    Volume = db.Column(db.Float, nullable=False)
    Strength = db.Column(db.Float, nullable=False)


@socketio.on('print')
def print_out(data):
    print(data)


@socketio.on('add_drink')
def add_drink(data):
    new_drink = Drinks(
        User=data['User'],
        Volume=data['Volume'],
        Strength=data['Strength']
    )
    db.session.add(new_drink)
    db.session.commit()

    data = Drinks.query.all()

    # Create a list of drinks for each user
    users = {}
    for i in data:
        user = i.User
        volume = i.Volume
        strength = i.Strength
        time = i.Time.timestamp()

        if user not in users:
            users[user] = []
        users[user].append([volume, strength, time])

    [print(i) for i in users[user]]

    socketio.emit('update_data', users)


@app.route('/')
def index():
    return render_template("index.html")


@app.route('/data')
def data():
    # Your data logic here
    return {"data": [1, 2, 3, 4]}


if __name__ == '__main__':
    app.run(debug=True, host='192.168.1.250')
    while True:
        time.sleep(1)
        print("Hello")
