from flask import Flask, render_template, request, redirect, url_for, flash, jsonify
from flask_sqlalchemy import SQLAlchemy
from flask_login import LoginManager, UserMixin, login_user, logout_user, login_required, current_user
from werkzeug.security import check_password_hash
from flask_wtf import FlaskForm, CSRFProtect

# Initialize extensions
db = SQLAlchemy()
login_manager = LoginManager()

# Define the User model
class User(UserMixin, db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(20), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password = db.Column(db.String(60), nullable=False)
    name = db.Column(db.String(100), nullable=False)
    discord = db.Column(db.String(100), nullable=False)

# Define the application factory
import logging
from logging.handlers import RotatingFileHandler
import os

def create_app():
    app = Flask(__name__)
    app.config['APPLICATION_ROOT'] = '/admin'
    app.config['SECRET_KEY'] = 'your_secret_key'
    app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:////app/site.db'
    csrf = CSRFProtect(app)
    
    # Configure logging
    if not os.path.exists('logs'):
        os.mkdir('logs')
    file_handler = RotatingFileHandler('logs/application.log', maxBytes=10240, backupCount=10)
    file_handler.setFormatter(logging.Formatter(
        '%(asctime)s %(levelname)s: %(message)s [in %(pathname)s:%(lineno)d]'))
    file_handler.setLevel(logging.INFO)
    app.logger.addHandler(file_handler)

    app.logger.setLevel(logging.INFO)
    app.logger.info('Application startup')

    db.init_app(app)
    login_manager.init_app(app)
    login_manager.login_view = 'login'
    
    with app.app_context():
        db.create_all()

    # User loader
    @login_manager.user_loader
    def load_user(user_id):
        return User.query.get(int(user_id))

    # Home route
    @app.route('/')
    def home():
        if current_user.is_authenticated:
            return redirect(url_for('dashboard'))
        return redirect(url_for('login'))

    # Login route
    @app.route('/login', methods=['GET', 'POST'])
    def login():
        if request.method == 'POST':
            username = request.form['username']
            password = request.form['password']
            app.logger.info(f'Attempting to login user: {username}')
            user = User.query.filter_by(username=username).first()
            if user:
                app.logger.info('User found in database')
                # Here we check the password hash
                if check_password_hash(user.password, password):
                    login_user(user)
                    app.logger.info('Password correct: redirecting to dashboard')
                    return redirect(url_for('dashboard'))
                else:
                    app.logger.warning('Password incorrect')
                    flash('Invalid username or password')
            else:
                app.logger.warning('No user found with that username')
                flash('Invalid username or password')
        return render_template('login.html')



    # Dashboard route
    @app.route('/dashboard')
    @login_required
    def dashboard():
        return render_template('dashboard.html')

    @app.route('/logout', methods=['GET', 'POST'])
    @login_required
    def logout():
        logout_user()
        flash('You have been logged out.')
        return redirect(url_for('login'))

    
    @app.route('/debug/users')
    def debug_users():
        app.logger.info('Fetching all users from the database')
        users = User.query.all()
        for user in users:
            app.logger.info(f'ID: {user.id}, Username: {user.username}, Email: {user.email}, Password: {user.password}, Name: {user.name}, Discord: {user.discord}')
        return jsonify({'message': 'Check the console for user data.'})

    return app

# Run the application
if __name__ == '__main__':
    app = create_app()
    app.run(debug=True, host='0.0.0.0', port=5004)
