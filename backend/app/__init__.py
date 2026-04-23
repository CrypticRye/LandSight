from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
from flask_migrate import Migrate
import os
from dotenv import load_dotenv

load_dotenv()

db = SQLAlchemy()
migrate = Migrate()

def create_app(config=None):
    app = Flask(__name__)

    # ── Database (PostgreSQL) ─────────────────────────────────────────────────
    db_url = os.getenv(
        "DATABASE_URL",
        "postgresql://postgres:postgres@localhost:5432/land_classification"
    )
    app.config["SQLALCHEMY_DATABASE_URI"] = db_url
    app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

    # ── Upload limits ─────────────────────────────────────────────────────────
    app.config["MAX_CONTENT_LENGTH"] = 20 * 1024 * 1024   # 20 MB

    # ── Secret ───────────────────────────────────────────────────────────────
    app.config["SECRET_KEY"] = os.getenv("SECRET_KEY", "dev-secret-change-me")

    if config:
        app.config.update(config)

    # ── Extensions ────────────────────────────────────────────────────────────
    db.init_app(app)
    migrate.init_app(app, db)

    # ── CORS Configuration ────────────────────────────────────────────────────
    CORS(app,
         origins=["http://localhost:5173", "http://localhost:3000"],
         methods=["GET", "POST", "OPTIONS", "PUT", "DELETE"],
         allow_headers=["Content-Type", "Authorization"],
         supports_credentials=False
    )

    # ── Blueprints ────────────────────────────────────────────────────────────
    from app.routes import api_bp
    app.register_blueprint(api_bp, url_prefix="/api")

    # ── Create tables (dev convenience) ──────────────────────────────────────
    with app.app_context():
        db.create_all()

    return app