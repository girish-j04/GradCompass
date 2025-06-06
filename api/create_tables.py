#!/usr/bin/env python3
"""
Script to create/update database tables
Run this after adding new models
"""

import asyncio
import sys
import os

# Add the app directory to Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.database import engine, Base
from app.models.user import User
from app.models.profile import UserProfile, WorkExperience

async def create_tables():
    """Create all tables in the database"""
    try:
        async with engine.begin() as conn:
            # Drop all tables (be careful in production!)
            print("Dropping existing tables...")
            await conn.run_sync(Base.metadata.drop_all)
            
            # Create all tables
            print("Creating new tables...")
            await conn.run_sync(Base.metadata.create_all)
            
        print("✅ Database tables created successfully!")
        print("\nCreated tables:")
        print("- users")
        print("- user_profiles") 
        print("- work_experiences")
        
    except Exception as e:
        print(f"❌ Error creating tables: {e}")
        raise
    finally:
        await engine.dispose()

if __name__ == "__main__":
    print("Creating database tables...")
    asyncio.run(create_tables())