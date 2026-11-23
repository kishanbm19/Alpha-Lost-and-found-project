from sqlalchemy import create_engine, event, text
from sqlalchemy.orm import declarative_base, sessionmaker
from pgvector.psycopg2 import register_vector
from app.config import settings

engine = create_engine(settings.DATABASE_URL, pool_pre_ping=True)


@event.listens_for(engine, "connect")
def on_connect(dbapi_connection, connection_record):
    try:
        register_vector(dbapi_connection)
    except Exception:
        pass


SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def init_db():
    with engine.begin() as conn:
        conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))
    Base.metadata.create_all(bind=engine)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
