#!/usr/bin/env python3
"""
Database reset utility for PromptPlay
Provides options to clean/reset the database
"""
import os
import sys
from database import engine, Base, SessionLocal, User, GameRequest, JoinRequest

def reset_all():
    """Drop all tables and recreate them (complete reset)"""
    print("🗑️  Dropping all tables...")
    Base.metadata.drop_all(bind=engine)
    print("✅ All tables dropped")
    
    print("🔨 Creating fresh tables...")
    Base.metadata.create_all(bind=engine)
    print("✅ Database reset complete!")

def clear_all_data():
    """Keep tables but delete all data"""
    db = SessionLocal()
    try:
        print("🗑️  Clearing all data...")
        
        # Delete in order (respecting foreign keys)
        deleted_join_requests = db.query(JoinRequest).delete()
        print(f"   Deleted {deleted_join_requests} join requests")
        
        deleted_games = db.query(GameRequest).delete()
        print(f"   Deleted {deleted_games} game requests")
        
        deleted_users = db.query(User).delete()
        print(f"   Deleted {deleted_users} users")
        
        db.commit()
        print("✅ All data cleared!")
    except Exception as e:
        db.rollback()
        print(f"❌ Error: {e}")
    finally:
        db.close()

def clear_games_only():
    """Clear only game-related data, keep users"""
    db = SessionLocal()
    try:
        print("🗑️  Clearing game data...")
        
        deleted_join_requests = db.query(JoinRequest).delete()
        print(f"   Deleted {deleted_join_requests} join requests")
        
        deleted_games = db.query(GameRequest).delete()
        print(f"   Deleted {deleted_games} game requests")
        
        db.commit()
        print("✅ Game data cleared! Users preserved.")
    except Exception as e:
        db.rollback()
        print(f"❌ Error: {e}")
    finally:
        db.close()

def show_stats():
    """Show current database statistics"""
    db = SessionLocal()
    try:
        user_count = db.query(User).count()
        game_count = db.query(GameRequest).count()
        join_count = db.query(JoinRequest).count()
        
        print("\n📊 Database Statistics:")
        print(f"   Users: {user_count}")
        print(f"   Game Requests: {game_count}")
        print(f"   Join Requests: {join_count}")
        
        if user_count > 0:
            print("\n👥 Users:")
            users = db.query(User).all()
            for user in users:
                guest_badge = " (Guest)" if user.is_guest else ""
                print(f"   - {user.username}{guest_badge} (ID: {user.id})")
        
    finally:
        db.close()

def delete_database_file():
    """Delete the database file completely"""
    db_path = "./promptplay.db"
    if os.path.exists(db_path):
        print(f"🗑️  Deleting database file: {db_path}")
        os.remove(db_path)
        print("✅ Database file deleted!")
        print("💡 Run the backend to create a fresh database")
    else:
        print("❌ Database file not found")

def main():
    print("🎮 PromptPlay Database Reset Utility\n")
    
    if len(sys.argv) > 1:
        command = sys.argv[1]
        
        if command == "stats":
            show_stats()
        elif command == "clear-all":
            show_stats()
            confirm = input("\n⚠️  Delete ALL data? (yes/no): ")
            if confirm.lower() == 'yes':
                clear_all_data()
                show_stats()
        elif command == "clear-games":
            show_stats()
            confirm = input("\n⚠️  Delete all games but keep users? (yes/no): ")
            if confirm.lower() == 'yes':
                clear_games_only()
                show_stats()
        elif command == "reset":
            show_stats()
            confirm = input("\n⚠️  RESET entire database (drop & recreate)? (yes/no): ")
            if confirm.lower() == 'yes':
                reset_all()
                show_stats()
        elif command == "delete-file":
            show_stats()
            confirm = input("\n⚠️  DELETE database file completely? (yes/no): ")
            if confirm.lower() == 'yes':
                delete_database_file()
        else:
            print(f"❌ Unknown command: {command}")
            print_usage()
    else:
        print_usage()
        show_stats()

def print_usage():
    print("Usage: python reset_db.py [command]")
    print("\nCommands:")
    print("  stats         - Show database statistics")
    print("  clear-all     - Delete all data but keep tables")
    print("  clear-games   - Delete games/join requests, keep users")
    print("  reset         - Drop and recreate all tables (fresh start)")
    print("  delete-file   - Delete the database file completely")
    print("\nExamples:")
    print("  python reset_db.py stats")
    print("  python reset_db.py clear-games")
    print("  python reset_db.py reset")

if __name__ == "__main__":
    main()
