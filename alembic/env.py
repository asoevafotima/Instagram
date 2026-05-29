from logging.config import fileConfig
from sqlalchemy import engine_from_config, pool
from alembic import context
from database import Base

from users import models
from posts import models
from medias import models
from stories import models
from likes import models
from comments import models
from follows import models
from blocks import models
from saved import models
from tags import models
from chats import models
from messages import models
from notifications import models

config = context.config
fileConfig(config.config_file_name)
target_metadata = Base.metadata

def run_migrations_offline():
    url = config.get_main_option("sqlalchemy.url")
    context.configure(url=url, target_metadata=target_metadata, literal_binds=True)
    with context.begin_transaction():
        context.run_migrations()

def run_migrations_online():
    connectable = engine_from_config(config.get_section(config.config_ini_section), prefix="sqlalchemy.", poolclass=pool.NullPool)
    with connectable.connect() as connection:
        context.configure(connection=connection, target_metadata=target_metadata)
        with context.begin_transaction():
            context.run_migrations()

if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()