import flask
from flask import Flask, render_template, request
from flask_socketio import SocketIO
from flask_sqlalchemy import SQLAlchemy
app = Flask(__name__)
socketio = SocketIO(app)
app.config['SQLALCHEMY_DATABASE_URI'] = 'mysql://root:root@db/main'
db = SQLAlchemy(app)


class Drinks(db.Model):
    ID = db.Column(db.Integer, primary_key=True, autoincrement=True)
    User = db.Column(db.String(50), nullable=False)
    Time = db.Column(db.DateTime, default=db.func.current_timestamp())
    Volume = db.Column(db.Float, nullable=False)
    Strength = db.Column(db.Float, nullable=False)


class Users(db.Model):
    User = db.Column(db.String(50), primary_key=True, nullable=False)
    Weight = db.Column(db.Float, nullable=False)
    Gender = db.Column(db.String(6), nullable=False)


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

    drinks, users = fetch_data()
    socketio.emit('update_data', [drinks, users])


def fetch_data():
    drinks = Drinks.query.all()
    users = Users.query.all()

    # Create a list of drinks for each user
    new_drinks = {}
    for i in drinks:
        user = i.User
        volume = i.Volume
        strength = i.Strength
        time = i.Time.timestamp()

        if user not in new_drinks:
            new_drinks[user] = []

        new_drinks[user].append([volume, strength, time])

    # Create a list of users
    new_users = {}
    for i in users:
        user = i.User
        weight = i.Weight
        gender = i.Gender
        new_users[user] = [weight, gender]

    return new_drinks, new_users


@socketio.on('get_data')
def send_data():
    drinks, users = fetch_data()
    socketio.emit('update_data', [drinks, users], room=request.sid)


@socketio.on('new_user')
def new_user(data):
    user = data[0]
    weight = data[1]
    gender = data[2]

    new_user = Users(
        User=user,
        Weight=weight,
        Gender=gender
    )

    db.session.merge(new_user)
    db.session.commit()


@socketio.on('remove_user')
def remove_user(username):
    drinks = Drinks.query.filter_by(User=username).all()
    for i in drinks:
        db.session.delete(i)
    db.session.commit()

    drinks, users = fetch_data()
    socketio.emit('update_data', [drinks, users])


@app.route('/')
def index():
    delete_cookies = True
    if delete_cookies:
        for cookie in request.cookies:
            flask.make_response().set_cookie(cookie, expires=0)
    return render_template("extra.html")


@app.route('/graph')
def data():
    return render_template("graph.html")


@socketio.on('remove_last_drink')
def remove_last_drink(username):
    drinks = Drinks.query.filter_by(User=username).all()
    if len(drinks) > 0:
        db.session.delete(drinks[-1])
        db.session.commit()

    drinks, users = fetch_data()
    socketio.emit('update_data', [drinks, users])


if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=6969)
