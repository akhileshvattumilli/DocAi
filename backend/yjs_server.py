#!/usr/bin/env python3
"""
Simple Yjs WebSocket server for collaborative editing
Run this alongside your Django server for real-time collaboration
"""

import asyncio
import json
import logging
import websockets
from websockets.server import serve
import yaml
import os
import sys
from pathlib import Path

# Add Django project to path
sys.path.append(os.path.join(os.path.dirname(__file__), 'src'))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'cfehome.settings')

import django
django.setup()

from documents.models import Doc

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class YjsWebSocketServer:
    def __init__(self, host="localhost", port=1234):
        self.host = host
        self.port = port
        self.rooms = {}  # Store room data: {room_id: {clients: set(), yjs_state: bytes}}
        
    def save_document_to_db(self, room_id, yjs_state):
        """Save YJS document state to database"""
        try:
            if not yjs_state:
                return
                
            # Store the YJS state in the database
            doc_obj = Doc.objects.filter(id=room_id).first()
            if doc_obj:
                # Convert bytes to base64 string for storage
                import base64
                yjs_state_str = base64.b64encode(yjs_state).decode('utf-8')
                doc_obj.yjs_state = yjs_state_str
                doc_obj.save()
                logger.info(f"Saved YJS state for document {room_id} to database")
        except Exception as e:
            logger.error(f"Failed to save document {room_id}: {e}")
        
    async def handle_client(self, websocket, path):
        """Handle a new WebSocket connection"""
        try:
            # Extract room ID from path (format: /room_id)
            room_id = path.lstrip('/')
            if not room_id:
                room_id = 'default'
            
            logger.info(f"Client connected to room: {room_id}")
            
            # Add client to room
            if room_id not in self.rooms:
                # Load existing YJS state from database if available
                yjs_state = b''
                try:
                    doc_obj = Doc.objects.filter(id=room_id).first()
                    if doc_obj and doc_obj.yjs_state:
                        import base64
                        yjs_state = base64.b64decode(doc_obj.yjs_state)
                        logger.info(f"Loaded existing YJS state for document {room_id}")
                except Exception as e:
                    logger.error(f"Failed to load YJS state for document {room_id}: {e}")
                
                self.rooms[room_id] = {
                    'clients': set(),
                    'yjs_state': yjs_state
                }
            
            self.rooms[room_id]['clients'].add(websocket)
            
            # Send current Yjs state to new client
            if self.rooms[room_id]['yjs_state']:
                await websocket.send(self.rooms[room_id]['yjs_state'])
            
            # Handle messages from this client
            async for message in websocket:
                if isinstance(message, bytes):
                    # Update room state
                    self.rooms[room_id]['yjs_state'] = message
                    
                    # Broadcast to all other clients in the room
                    for client in self.rooms[room_id]['clients']:
                        if client != websocket and not client.closed:
                            try:
                                await client.send(message)
                            except websockets.exceptions.ConnectionClosed:
                                pass
                                
        except websockets.exceptions.ConnectionClosed:
            pass
        except Exception as e:
            logger.error(f"Error handling client: {e}")
        finally:
            # Remove client from room
            if room_id in self.rooms:
                self.rooms[room_id]['clients'].discard(websocket)
                
                # Save document to database before cleaning up empty rooms
                if not self.rooms[room_id]['clients']:
                    # Save the current YJS state to database before deleting the room
                    self.save_document_to_db(room_id, self.rooms[room_id]['yjs_state'])
                    del self.rooms[room_id]
                    
            logger.info(f"Client disconnected from room: {room_id}")
    
    async def periodic_save(self):
        """Periodically save all active documents to database"""
        while True:
            try:
                await asyncio.sleep(30)  # Save every 30 seconds
                for room_id, room_data in self.rooms.items():
                    if room_data['yjs_state']:
                        self.save_document_to_db(room_id, room_data['yjs_state'])
            except Exception as e:
                logger.error(f"Error in periodic save: {e}")

    async def start_server(self):
        """Start the WebSocket server"""
        logger.info(f"Starting Yjs WebSocket server on {self.host}:{self.port}")
        
        # Start periodic save task
        save_task = asyncio.create_task(self.periodic_save())
        
        try:
            async with serve(self.handle_client, self.host, self.port):
                await asyncio.Future()  # Run forever
        finally:
            save_task.cancel()

def main():
    """Main entry point"""
    # Get configuration from environment or use defaults
    host = os.getenv('YJS_HOST', 'localhost')
    port = int(os.getenv('YJS_PORT', '1234'))
    
    server = YjsWebSocketServer(host, port)
    
    try:
        asyncio.run(server.start_server())
    except KeyboardInterrupt:
        logger.info("Server stopped by user")
    except Exception as e:
        logger.error(f"Server error: {e}")

if __name__ == "__main__":
    main()
