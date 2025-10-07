"use client"

import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Collaboration from '@tiptap/extension-collaboration'
import Underline from '@tiptap/extension-underline'
import Link from '@tiptap/extension-link'
import TextAlign from '@tiptap/extension-text-align'
import Placeholder from '@tiptap/extension-placeholder'
import { useEffect, useRef, useState } from 'react'
import * as Y from 'yjs'
import { WebsocketProvider } from 'y-websocket'
import './docEditor.css'

export default function DocEditor({ ref, initialData, placeholder, onSave, docId, titleElement }) {
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
      Underline,
      Link.configure({
        openOnClick: true,
        autolink: true,
        protocols: ['http', 'https', 'mailto']
      }),
      TextAlign.configure({
        types: ['heading', 'paragraph']
      }),
      Placeholder.configure({
        placeholder: (props) => props?.node?.type?.name === 'paragraph' ? (placeholder || 'Write something …') : '',
      }),
      Collaboration.configure({
        document: ydocRef.current,
        field: 'content',
      }),
      // CollaborationCursor intentionally omitted to avoid runtime issues
    ] : [
      StarterKit.configure({
        history: false,
      }),
      Underline,
      Link.configure({
        openOnClick: true,
        autolink: true,
        protocols: ['http', 'https', 'mailto']
      }),
      TextAlign.configure({
        types: ['heading', 'paragraph']
      }),
      Placeholder.configure({
        placeholder: (props) => props?.node?.type?.name === 'paragraph' ? (placeholder || 'Write something …') : '',
      }),
    ],
    content: '', // Let Yjs handle the content
    editorProps: {
      attributes: {
        class: 'focus:outline-none min-h-[600px]',
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
      <div className="editor-container">
        <div className="editor-page flex items-center justify-center min-h-[600px]">
          {docId ? 'Connecting to collaboration server...' : 'Loading editor...'}
        </div>
      </div>
    )
  }

  return (
    <div className="w-full">
      {/* Toolbar */}
      <div className="w-full border-b bg-gray-50 p-2">
        <div className="flex items-center justify-between max-w-[816px] mx-auto">
          {/* Left side - Empty for now */}
          <div className="flex items-center gap-1">
          </div>

          {/* Center - Main formatting tools */}
          <div className="flex items-center gap-1">
            {/* Separator */}
            <div className="w-px h-6 bg-gray-300 mx-2"></div>
            
            {/* Heading dropdown */}
            <div className="relative group">
              <button
                type="button"
                className={`h-8 px-3 rounded flex items-center gap-1 text-sm font-medium transition-colors ${
                  editor.isActive('heading') ? 'bg-blue-100 text-blue-700' : 'hover:bg-gray-200 text-gray-700'
                }`}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M5 6C5 5.44772 4.55228 5 4 5C3.44772 5 3 5.44772 3 6V18C3 18.5523 3.44772 19 4 19C4.55228 19 5 18.5523 5 18V13H11V18C11 18.5523 11.4477 19 12 19C12.5523 19 13 18.5523 13 18V6C13 5.44772 12.5523 5 12 5C11.4477 5 11 5.44772 11 6V11H5V6Z"/>
                  <path d="M21.0001 10C21.0001 9.63121 20.7971 9.29235 20.472 9.11833C20.1468 8.94431 19.7523 8.96338 19.4454 9.16795L16.4454 11.168C15.9859 11.4743 15.8617 12.0952 16.1681 12.5547C16.4744 13.0142 17.0953 13.1384 17.5548 12.8321L19.0001 11.8685V18C19.0001 18.5523 19.4478 19 20.0001 19C20.5524 19 21.0001 18.5523 21.0001 18V10Z"/>
                </svg>
                <span>Heading</span>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M5.29289 8.29289C5.68342 7.90237 6.31658 7.90237 6.70711 8.29289L12 13.5858L17.2929 8.29289C17.6834 7.90237 18.3166 7.90237 18.7071 8.29289C19.0976 8.68342 19.0976 9.31658 18.7071 9.70711L12.7071 15.7071C12.3166 16.0976 11.6834 16.0976 11.2929 15.7071L5.29289 9.70711C4.90237 9.31658 4.90237 8.68342 5.29289 8.29289Z"/>
                </svg>
              </button>
              
              {/* Dropdown menu */}
              <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 min-w-[120px]">
                <div className="py-1">
                  <button
                    type="button"
                    onClick={() => editor.chain().focus().setParagraph().run()}
                    className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-100 ${
                      editor.isActive('paragraph') ? 'bg-blue-50 text-blue-700' : 'text-gray-700'
                    }`}
                  >
                    Paragraph
                  </button>
                  <button
                    type="button"
                    onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
                    className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-100 ${
                      editor.isActive('heading', { level: 1 }) ? 'bg-blue-50 text-blue-700' : 'text-gray-700'
                    }`}
                  >
                    Heading 1
                  </button>
                  <button
                    type="button"
                    onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
                    className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-100 ${
                      editor.isActive('heading', { level: 2 }) ? 'bg-blue-50 text-blue-700' : 'text-gray-700'
                    }`}
                  >
                    Heading 2
                  </button>
                  <button
                    type="button"
                    onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
                    className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-100 ${
                      editor.isActive('heading', { level: 3 }) ? 'bg-blue-50 text-blue-700' : 'text-gray-700'
                    }`}
                  >
                    Heading 3
                  </button>
                </div>
              </div>
            </div>

            {/* Separator */}
            <div className="w-px h-6 bg-gray-300 mx-2"></div>

            {/* Text formatting */}
            <button
              type="button"
              onClick={() => editor.chain().focus().toggleBold().run()}
              className={`h-8 w-8 rounded flex items-center justify-center transition-colors ${
                editor.isActive('bold') ? 'bg-blue-100 text-blue-700' : 'hover:bg-gray-200 text-gray-700'
              }`}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M6 2.5C5.17157 2.5 4.5 3.17157 4.5 4V20C4.5 20.8284 5.17157 21.5 6 21.5H15C16.4587 21.5 17.8576 20.9205 18.8891 19.8891C19.9205 18.8576 20.5 17.4587 20.5 16C20.5 14.5413 19.9205 13.1424 18.8891 12.1109C18.6781 11.9 18.4518 11.7079 18.2128 11.5359C19.041 10.5492 19.5 9.29829 19.5 8C19.5 6.54131 18.9205 5.14236 17.8891 4.11091C16.8576 3.07946 15.4587 2.5 14 2.5H6ZM14 10.5C14.663 10.5 15.2989 10.2366 15.7678 9.76777C16.2366 9.29893 16.5 8.66304 16.5 8C16.5 7.33696 16.2366 6.70107 15.7678 6.23223C15.2989 5.76339 14.663 5.5 14 5.5H7.5V10.5H14ZM7.5 18.5V13.5H15C15.663 13.5 16.2989 13.7634 16.7678 14.2322C17.2366 14.7011 17.5 15.337 17.5 16C17.5 16.663 17.2366 17.2989 16.7678 17.7678C16.2989 18.2366 15.663 18.5 15 18.5H7.5Z"/>
              </svg>
            </button>
            <button
              type="button"
              onClick={() => editor.chain().focus().toggleItalic().run()}
              className={`h-8 w-8 rounded flex items-center justify-center transition-colors ${
                editor.isActive('italic') ? 'bg-blue-100 text-blue-700' : 'hover:bg-gray-200 text-gray-700'
              }`}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M15.0222 3H19C19.5523 3 20 3.44772 20 4C20 4.55228 19.5523 5 19 5H15.693L10.443 19H14C14.5523 19 15 19.4477 15 20C15 20.5523 14.5523 21 14 21H9.02418C9.00802 21.0004 8.99181 21.0004 8.97557 21H5C4.44772 21 4 20.5523 4 20C4 19.4477 4.44772 19 5 19H8.30704L13.557 5H10C9.44772 5 9 4.55228 9 4C9 3.44772 9.44772 3 10 3H14.9782C14.9928 2.99968 15.0075 2.99967 15.0222 3Z"/>
              </svg>
            </button>
            <button
              type="button"
              onClick={() => editor.chain().focus().toggleUnderline().run()}
              className={`h-8 w-8 rounded flex items-center justify-center transition-colors ${
                editor.isActive('underline') ? 'bg-blue-100 text-blue-700' : 'hover:bg-gray-200 text-gray-700'
              }`}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M7 4C7 3.44772 6.55228 3 6 3C5.44772 3 5 3.44772 5 4V10C5 11.8565 5.7375 13.637 7.05025 14.9497C8.36301 16.2625 10.1435 17 12 17C13.8565 17 15.637 16.2625 16.9497 14.9497C18.2625 13.637 19 11.8565 19 10V4C19 3.44772 18.5523 3 18 3C17.4477 3 17 3.44772 17 4V10C17 11.3261 16.4732 12.5979 15.5355 13.5355C14.5979 14.4732 13.3261 15 12 15C10.6739 15 9.40215 14.4732 8.46447 13.5355C7.52678 12.5979 7 11.3261 7 10V4ZM4 19C3.44772 19 3 19.4477 3 20C3 20.5523 3.44772 21 4 21H20C20.5523 21 21 20.5523 21 20C21 19.4477 20.5523 19 20 19H4Z"/>
              </svg>
            </button>

            {/* Separator */}
            <div className="w-px h-6 bg-gray-300 mx-2"></div>

            {/* Lists */}
            <button
              type="button"
              onClick={() => editor.chain().focus().toggleBulletList().run()}
              className={`h-8 w-8 rounded flex items-center justify-center transition-colors ${
                editor.isActive('bulletList') ? 'bg-blue-100 text-blue-700' : 'hover:bg-gray-200 text-gray-700'
              }`}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M7 6C7 5.44772 7.44772 5 8 5H21C21.5523 5 22 5.44772 22 6C22 6.55228 21.5523 7 21 7H8C7.44772 7 7 6.55228 7 6Z"/>
                <path d="M7 12C7 11.4477 7.44772 11 8 11H21C21.5523 11 22 11.4477 22 12C22 12.5523 21.5523 13 21 13H8C7.44772 13 7 12.5523 7 12Z"/>
                <path d="M7 18C7 17.4477 7.44772 17 8 17H21C21.5523 17 22 17.4477 22 18C22 18.5523 21.5523 19 21 19H8C7.44772 19 7 18.5523 7 18Z"/>
                <path d="M2 6C2 5.44772 2.44772 5 3 5H3.01C3.56228 5 4.01 5.44772 4.01 6C4.01 6.55228 3.56228 7 3.01 7H3C2.44772 7 2 6.55228 2 6Z"/>
                <path d="M2 12C2 11.4477 2.44772 11 3 11H3.01C3.56228 11 4.01 11.4477 4.01 12C4.01 12.5523 3.56228 13 3.01 13H3C2.44772 13 2 12.5523 2 12Z"/>
                <path d="M2 18C2 17.4477 2.44772 17 3 17H3.01C3.56228 17 4.01 17.4477 4.01 18C4.01 18.5523 3.56228 19 3.01 19H3C2.44772 19 2 18.5523 2 18Z"/>
              </svg>
            </button>
            <button
              type="button"
              onClick={() => editor.chain().focus().toggleOrderedList().run()}
              className={`h-8 w-8 rounded flex items-center justify-center transition-colors ${
                editor.isActive('orderedList') ? 'bg-blue-100 text-blue-700' : 'hover:bg-gray-200 text-gray-700'
              }`}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M7 6C7 5.44772 7.44772 5 8 5H21C21.5523 5 22 5.44772 22 6C22 6.55228 21.5523 7 21 7H8C7.44772 7 7 6.55228 7 6Z"/>
                <path d="M7 12C7 11.4477 7.44772 11 8 11H21C21.5523 11 22 11.4477 22 12C22 12.5523 21.5523 13 21 13H8C7.44772 13 7 12.5523 7 12Z"/>
                <path d="M7 18C7 17.4477 7.44772 17 8 17H21C21.5523 17 22 17.4477 22 18C22 18.5523 21.5523 19 21 19H8C7.44772 19 7 18.5523 7 18Z"/>
                <path d="M3 5C3.55228 5 4 5.44772 4 6C4 6.55228 3.55228 7 3 7C2.44772 7 2 6.55228 2 6C2 5.44772 2.44772 5 3 5Z"/>
                <path d="M3 11C3.55228 11 4 11.4477 4 12C4 12.5523 3.55228 13 3 13C2.44772 13 2 12.5523 2 12C2 11.4477 2.44772 11 3 11Z"/>
                <path d="M3 17C3.55228 17 4 17.4477 4 18C4 18.5523 3.55228 19 3 19C2.44772 19 2 18.5523 2 18C2 17.4477 2.44772 17 3 17Z"/>
              </svg>
            </button>

            {/* Separator */}
            <div className="w-px h-6 bg-gray-300 mx-2"></div>

            {/* Alignment */}
            <button
              type="button"
              onClick={() => editor.chain().focus().setTextAlign('left').run()}
              className={`h-8 w-8 rounded flex items-center justify-center transition-colors ${
                editor.isActive({ textAlign: 'left' }) ? 'bg-blue-100 text-blue-700' : 'hover:bg-gray-200 text-gray-700'
              }`}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M2 6C2 5.44772 2.44772 5 3 5H21C21.5523 5 22 5.44772 22 6C22 6.55228 21.5523 7 21 7H3C2.44772 7 2 6.55228 2 6Z"/>
                <path d="M2 12C2 11.4477 2.44772 11 3 11H15C15.5523 11 16 11.4477 16 12C16 12.5523 15.5523 13 15 13H3C2.44772 13 2 12.5523 2 12Z"/>
                <path d="M2 18C2 17.4477 2.44772 17 3 17H17C17.5523 17 18 17.4477 18 18C18 18.5523 17.5523 19 17 19H3C2.44772 19 2 18.5523 2 18Z"/>
              </svg>
            </button>
            <button
              type="button"
              onClick={() => editor.chain().focus().setTextAlign('center').run()}
              className={`h-8 w-8 rounded flex items-center justify-center transition-colors ${
                editor.isActive({ textAlign: 'center' }) ? 'bg-blue-100 text-blue-700' : 'hover:bg-gray-200 text-gray-700'
              }`}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M2 6C2 5.44772 2.44772 5 3 5H21C21.5523 5 22 5.44772 22 6C22 6.55228 21.5523 7 21 7H3C2.44772 7 2 6.55228 2 6Z"/>
                <path d="M6 12C6 11.4477 6.44772 11 7 11H17C17.5523 11 18 11.4477 18 12C18 12.5523 17.5523 13 17 13H7C6.44772 13 6 12.5523 6 12Z"/>
                <path d="M4 18C4 17.4477 4.44772 17 5 17H19C19.5523 17 20 17.4477 20 18C20 18.5523 19.5523 19 19 19H5C4.44772 19 4 18.5523 4 18Z"/>
              </svg>
            </button>
            <button
              type="button"
              onClick={() => editor.chain().focus().setTextAlign('right').run()}
              className={`h-8 w-8 rounded flex items-center justify-center transition-colors ${
                editor.isActive({ textAlign: 'right' }) ? 'bg-blue-100 text-blue-700' : 'hover:bg-gray-200 text-gray-700'
              }`}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M2 6C2 5.44772 2.44772 5 3 5H21C21.5523 5 22 5.44772 22 6C22 6.55228 21.5523 7 21 7H3C2.44772 7 2 6.55228 2 6Z"/>
                <path d="M8 12C8 11.4477 8.44772 11 9 11H21C21.5523 11 22 11.4477 22 12C22 12.5523 21.5523 13 21 13H9C8.44772 13 8 12.5523 8 12Z"/>
                <path d="M6 18C6 17.4477 6.44772 17 7 17H21C21.5523 17 22 17.4477 22 18C22 18.5523 21.5523 19 21 19H7C6.44772 19 6 18.5523 6 18Z"/>
              </svg>
            </button>
          </div>

          {/* Right side - Additional tools */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => {
                const previousUrl = editor.getAttributes('link').href
                const url = window.prompt('URL', previousUrl || '')
                if (url === null) return
                if (url === '') {
                  editor.chain().focus().extendMarkRange('link').unsetLink().run()
                  return
                }
                editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
              }}
              className={`h-8 w-8 rounded flex items-center justify-center transition-colors ${
                editor.isActive('link') ? 'bg-blue-100 text-blue-700' : 'hover:bg-gray-200 text-gray-700'
              }`}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M16.9958 1.06669C15.4226 1.05302 13.907 1.65779 12.7753 2.75074L12.765 2.76086L11.045 4.47086C10.6534 4.86024 10.6515 5.49341 11.0409 5.88507C11.4303 6.27673 12.0634 6.27858 12.4551 5.88919L14.1697 4.18456C14.9236 3.45893 15.9319 3.05752 16.9784 3.06662C18.0272 3.07573 19.0304 3.49641 19.772 4.23804C20.5137 4.97967 20.9344 5.98292 20.9435 7.03171C20.9526 8.07776 20.5515 9.08563 19.8265 9.83941L16.833 12.8329C16.4274 13.2386 15.9393 13.5524 15.4019 13.7529C14.8645 13.9533 14.2903 14.0359 13.7181 13.9949C13.146 13.9539 12.5894 13.7904 12.0861 13.5154C11.5827 13.2404 11.1444 12.8604 10.8008 12.401C10.47 11.9588 9.84333 11.8685 9.40108 12.1993C8.95883 12.5301 8.86849 13.1568 9.1993 13.599C9.71464 14.288 10.3721 14.858 11.1272 15.2705C11.8822 15.683 12.7171 15.9283 13.5753 15.9898C14.4334 16.0513 15.2948 15.9274 16.1009 15.6267C16.907 15.326 17.639 14.8555 18.2473 14.247L21.2472 11.2471L21.2593 11.2347C22.3523 10.1031 22.9571 8.58751 22.9434 7.01433C22.9297 5.44115 22.2987 3.93628 21.1863 2.82383C20.0738 1.71138 18.5689 1.08036 16.9958 1.06669Z"/>
                <path d="M10.4247 8.0102C9.56657 7.94874 8.70522 8.07256 7.89911 8.37326C7.09305 8.67395 6.36096 9.14458 5.75272 9.753L2.75285 12.7529L2.74067 12.7653C1.64772 13.8969 1.04295 15.4125 1.05662 16.9857C1.07029 18.5589 1.70131 20.0637 2.81376 21.1762C3.9262 22.2886 5.43108 22.9196 7.00426 22.9333C8.57744 22.947 10.0931 22.3422 11.2247 21.2493L11.2371 21.2371L12.9471 19.5271C13.3376 19.1366 13.3376 18.5034 12.9471 18.1129C12.5565 17.7223 11.9234 17.7223 11.5328 18.1129L9.82932 19.8164C9.07555 20.5414 8.06768 20.9425 7.02164 20.9334C5.97285 20.9243 4.9696 20.5036 4.22797 19.762C3.48634 19.0203 3.06566 18.0171 3.05655 16.9683C3.04746 15.9222 3.44851 14.9144 4.17355 14.1606L7.16719 11.167C7.5727 10.7613 8.06071 10.4476 8.59811 10.2471C9.13552 10.0467 9.70976 9.96412 10.2819 10.0051C10.854 10.0461 11.4106 10.2096 11.9139 10.4846C12.4173 10.7596 12.8556 11.1397 13.1992 11.599C13.53 12.0412 14.1567 12.1316 14.5989 11.8007C15.0412 11.4699 15.1315 10.8433 14.8007 10.401C14.2854 9.71205 13.6279 9.14198 12.8729 8.72948C12.1178 8.31697 11.2829 8.07166 10.4247 8.0102Z"/>
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Editor */}
      <div className="editor-container">
        <div className="editor-page">
          <EditorContent 
            editor={editor}
          />
        </div>
      </div>

      {/* Connection Status and Users */}
      <div className="mt-4 max-w-[816px] mx-auto">
        <div className="p-3 bg-gray-50 rounded-md border flex items-center justify-between">
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
    </div>
  )
}
