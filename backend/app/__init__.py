from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
from flask_migrate import Migrate
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
import os
from dotenv import load_dotenv

load_dotenv()

db      = SQLAlchemy()
migrate = Migrate()
limiter = Limiter(key_func=get_remote_address, default_limits=[], storage_uri="memory://")


def create_app(config=None):
    app = Flask(__name__)

    # ── Secret key (any value is fine for localhost-only use) ─────────────────
    app.config["SECRET_KEY"] = os.getenv("SECRET_KEY", "landsight-local-dev-key")

    # ── Database ──────────────────────────────────────────────────────────────
    db_url = os.getenv(
        "DATABASE_URL",
        "postgresql://postgres:postgres@localhost:5432/land_classification"
    )
    app.config["SQLALCHEMY_DATABASE_URI"] = db_url
    app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

    # ── Upload limits ─────────────────────────────────────────────────────────
    app.config["MAX_CONTENT_LENGTH"] = 20 * 1024 * 1024   # 20 MB

    if config:
        app.config.update(config)

    # ── Extensions ────────────────────────────────────────────────────────────
    db.init_app(app)
    migrate.init_app(app, db)
    limiter.init_app(app)

    # ── CORS — allow localhost dev ports ──────────────────────────────────────
    raw_origins = os.getenv("ALLOWED_ORIGINS", "http://localhost:5173,http://localhost:3000")
    allowed_origins = [o.strip() for o in raw_origins.split(",") if o.strip()]
    CORS(
        app,
        origins=allowed_origins,
        methods=["GET", "POST", "OPTIONS", "PUT", "DELETE"],
        allow_headers=["Content-Type", "Authorization"],
        supports_credentials=False,
    )

    # ── Security headers ──────────────────────────────────────────────────────
    @app.after_request
    def set_security_headers(response):
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"]        = "DENY"
        response.headers["X-XSS-Protection"]       = "1; mode=block"
        response.headers["Referrer-Policy"]        = "strict-origin-when-cross-origin"
        return response

    # ── Blueprints ────────────────────────────────────────────────────────────
    from app.routes import api_bp
    app.register_blueprint(api_bp, url_prefix="/api")

    # ── Create tables (dev convenience) ──────────────────────────────────────
    with app.app_context():
        db.create_all()

    # ── Pre-load ML model in background thread so /api/ready resolves quickly ─
    import threading
    from app.utils import load_model
    t = threading.Thread(target=load_model, daemon=True)
    t.start()

    return app