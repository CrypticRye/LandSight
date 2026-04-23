"""
One-time setup script: creates the PostgreSQL database and all tables.
Reads credentials from .env — no hardcoded values.
Run once: python create_db.py
"""
import os
import re
from dotenv import load_dotenv

load_dotenv()

# ── Parse DATABASE_URL from .env ──────────────────────────────────────────────
# Format: postgresql://user:password@host:port/dbname
DATABASE_URL = os.getenv("DATABASE_URL", "")

if not DATABASE_URL or not DATABASE_URL.startswith("postgresql"):
    print("[ERROR] DATABASE_URL is not set or is not a PostgreSQL URL.")
    print("  Expected format: postgresql://user:password@host:port/dbname")
    print("  Check your .env file.")
    exit(1)

# Parse the URL
match = re.match(
    r"postgresql://(?P<user>[^:]+):(?P<password>[^@]+)@(?P<host>[^:]+):(?P<port>\d+)/(?P<dbname>.+)",
    DATABASE_URL
)
if not match:
    print("[ERROR] Could not parse DATABASE_URL. Check the format in your .env file.")
    exit(1)

DB_USER     = match.group("user")
DB_PASSWORD = match.group("password")
DB_HOST     = match.group("host")
DB_PORT     = int(match.group("port"))
DB_NAME     = match.group("dbname")

print(f"[INFO] Connecting to PostgreSQL at {DB_HOST}:{DB_PORT} as '{DB_USER}'")
print(f"[INFO] Target database: '{DB_NAME}'")

# ── Step 1: Create the database if it doesn't exist ──────────────────────────
try:
    import psycopg2
    from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT

    conn = psycopg2.connect(
        host=DB_HOST,
        port=DB_PORT,
        user=DB_USER,
        password=DB_PASSWORD,
        dbname="postgres"          # connect to default DB first
    )
    conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
    cur = conn.cursor()

    cur.execute("SELECT 1 FROM pg_database WHERE datname = %s", (DB_NAME,))
    if cur.fetchone():
        print(f"[OK] Database '{DB_NAME}' already exists.")
    else:
        cur.execute(f"CREATE DATABASE {DB_NAME}")
        print(f"[OK] Database '{DB_NAME}' created.")

    cur.close()
    conn.close()

except Exception as e:
    print(f"[ERROR] Could not connect to PostgreSQL: {e}")
    print("  Make sure PostgreSQL is running and your .env credentials are correct.")
    exit(1)

# ── Step 2: Create all tables via Flask-SQLAlchemy ────────────────────────────
from app import create_app, db

app = create_app()
with app.app_context():
    db.create_all()
    print("[OK] Tables created:")
    print("       - classification_records")
    print("       - change_detection_records")
    print("       - sentinel_change_records")

print("\n✅ Setup complete! You can now run:  python run.py")
