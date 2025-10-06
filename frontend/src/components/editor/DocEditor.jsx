"use client"

import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Collaboration from '@tiptap/extension-collaboration'
import { useEffect, useRef, useState } from 'react'
import * as Y from 'yjs'
import { WebsocketProvider } from 'y-websocket'

export default function DocEditor({ ref, initialData, placeholder, onSave, docId }) {
  const ydocRef = useRef(null)
  const providerRef = useRef(null)
  const [isConnected, setIsConnected] = useState(false)
  const [users, setUsers] = useState([])
  const [isReady, setIsReady] = useState(false)

  // Initialize Yjs document and provider
  useEffect(() => {
    if (!docId) return

    // Create Yjs document
    const ydoc = new Y.Doc()
    ydocRef.current = ydoc

    // Create collaborative XML fragment for TipTap
    const yXmlFragment = ydoc.getXmlFragment('content')

    // Create WebSocket provider for real-time collaboration
    const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:1234'
    const provider = new WebsocketProvider(wsUrl, docId, ydoc)
    providerRef.current = provider

    // Handle connection status
    provider.on('status', (event) => {
      setIsConnected(event.status === 'connected')
      if (event.status === 'connected') {
        setIsReady(true)
      }
    })

    // Handle awareness (presence) changes
    provider.awareness.on('change', () => {
      const states = Array.from(provider.awareness.getStates().values())
      setUsers(states.map(state => ({
        name: state.user?.name || 'Anonymous',
        color: state.user?.color || '#ffb61e'
      })))
    })

    // Set user awareness information
    provider.awareness.setLocalStateField('user', {
      name: `User ${Math.floor(Math.random() * 1000)}`,
      color: `#${Math.floor(Math.random()*16777215).toString(16)}`
    })

    // Cleanup on unmount
    return () => {
      provider?.destroy()
      ydoc?.destroy()
      setIsReady(false)
    }
  }, [docId])

  const editor = useEditor({
    extensions: isReady && ydocRef.current ? [
      StarterKit.configure({
        history: false, // Disable local history since we're using collaborative history
      }),
      Collaboration.configure({
        document: ydocRef.current,
        field: 'content',
      }),
    ] : [
      StarterKit.configure({
        history: false,
      }),
    ],
    content: '', // Let Yjs handle the content
    editorProps: {
      attributes: {
        class: 'prose prose-sm sm:prose lg:prose-lg xl:prose-2xl mx-auto focus:outline-none min-h-[300px] p-4 border rounded-md',
      },
    },
    onUpdate: ({ editor }) => {
      // Handle autosave if onSave is provided
      if (onSave) {
        const content = editor.getHTML()
        onSave({ getData: () => content })
      }
    },
  }, [isReady, ydocRef.current, docId])


  // Expose editor methods to parent component
  useEffect(() => {
    if (ref && editor) {
      ref.current = {
        editor,
        getData: () => editor.getHTML(),
        getText: () => editor.getText(),
      }
    }
  }, [ref, editor])

  if (!editor) {
    return (
      <div className="prose prose-sm sm:prose lg:prose-lg xl:prose-2xl mx-auto min-h-[300px] p-4 border rounded-md bg-gray-50 flex items-center justify-center">
        {docId ? 'Connecting to collaboration server...' : 'Loading editor...'}
      </div>
    )
  }

  return (
    <div className="w-full">
      {/* Connection Status and Users */}
      <div className="mb-4 p-3 bg-gray-50 rounded-md border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
            <span className="text-sm font-medium">
              {isConnected ? 'Connected' : 'Disconnected'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">Collaborative editing:</span>
            <span className="text-sm font-medium text-green-600">
              {isConnected ? 'Active' : 'Connecting...'}
            </span>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="border border-b-0 rounded-t-md bg-gray-50 p-2 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={`px-3 py-1 rounded text-sm font-medium ${
            editor.isActive('bold') ? 'bg-blue-500 text-white' : 'bg-white text-gray-700 hover:bg-gray-100'
          }`}
        >
          Bold
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={`px-3 py-1 rounded text-sm font-medium ${
            editor.isActive('italic') ? 'bg-blue-500 text-white' : 'bg-white text-gray-700 hover:bg-gray-100'
          }`}
        >
          Italic
        </button>
        <div className="w-px h-6 bg-gray-300 mx-1"></div>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          className={`px-3 py-1 rounded text-sm font-medium ${
            editor.isActive('heading', { level: 1 }) ? 'bg-blue-500 text-white' : 'bg-white text-gray-700 hover:bg-gray-100'
          }`}
        >
          H1
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          className={`px-3 py-1 rounded text-sm font-medium ${
            editor.isActive('heading', { level: 2 }) ? 'bg-blue-500 text-white' : 'bg-white text-gray-700 hover:bg-gray-100'
          }`}
        >
          H2
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          className={`px-3 py-1 rounded text-sm font-medium ${
            editor.isActive('heading', { level: 3 }) ? 'bg-blue-500 text-white' : 'bg-white text-gray-700 hover:bg-gray-100'
          }`}
        >
          H3
        </button>
        <div className="w-px h-6 bg-gray-300 mx-1"></div>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={`px-3 py-1 rounded text-sm font-medium ${
            editor.isActive('bulletList') ? 'bg-blue-500 text-white' : 'bg-white text-gray-700 hover:bg-gray-100'
          }`}
        >
          List
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={`px-3 py-1 rounded text-sm font-medium ${
            editor.isActive('orderedList') ? 'bg-blue-500 text-white' : 'bg-white text-gray-700 hover:bg-gray-100'
          }`}
        >
          Numbered
        </button>
      </div>

      {/* Editor */}
      <EditorContent 
        editor={editor} 
        className="border rounded-b-md"
      />
    </div>
  )
}