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
from pathlib import Path

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class YjsWebSocketServer:
    def __init__(self, host="localhost", port=1234):
        self.host = host
        self.port = port
        self.rooms = {}  # Store room data: {room_id: {clients: set(), yjs_state: bytes}}
        
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
                self.rooms[room_id] = {
                    'clients': set(),
                    'yjs_state': b''
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
                
                # Clean up empty rooms
                if not self.rooms[room_id]['clients']:
                    del self.rooms[room_id]
                    
            logger.info(f"Client disconnected from room: {room_id}")
    
    async def start_server(self):
        """Start the WebSocket server"""
        logger.info(f"Starting Yjs WebSocket server on {self.host}:{self.port}")
        
        async with serve(self.handle_client, self.host, self.port):
            await asyncio.Future()  # Run forever

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
