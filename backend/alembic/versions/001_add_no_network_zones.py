"""Add NoNetworkZone

Revision ID: 001
Revises: 
Create Date: 2026-05-05 17:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
import sqlmodel
import geoalchemy2

# revision identifiers, used by Alembic.
revision = '001'
down_revision = None
branch_labels = None
depends_on = None

def upgrade() -> None:
    # Enable PostGIS extension
    op.execute('CREATE EXTENSION IF NOT EXISTS postgis;')

    op.create_table('no_network_zones',
        sa.Column('name', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column('description', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column('severity', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('geometry', geoalchemy2.types.Geometry(geometry_type='POLYGON', srid=4326, from_text='ST_GeomFromEWKT', name='geometry', spatial_index=True), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_no_network_zones_name'), 'no_network_zones', ['name'], unique=False)

def downgrade() -> None:
    op.drop_index(op.f('ix_no_network_zones_name'), table_name='no_network_zones')
    op.drop_table('no_network_zones')
