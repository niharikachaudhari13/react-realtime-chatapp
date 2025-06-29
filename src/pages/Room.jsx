import React, {useState, useEffect, useRef} from 'react'
import client, { databases, DATABASE_ID, COLLECTION_ID_MESSAGES, TYPING_COLLECTION_ID } from '../appwriteConfig'
import { ID, Query, Permission, Role} from 'appwrite';
import Header from '../components/Header';
import { useAuth } from '../utils/AuthContext';
import {Trash2, Smile, MoreHorizontal} from 'react-feather'
import { formatMessageTime, formatFullTime } from '../utils/timeUtils'
import Notification from '../components/Notification'



const Room = () => {
    const [messageBody, setMessageBody] = useState('')
    const [messages, setMessages] = useState([])
    const [isTyping, setIsTyping] = useState(false)
    const [typingUsers, setTypingUsers] = useState([])
    const [showReactionPicker, setShowReactionPicker] = useState(null)
    const [notifications, setNotifications] = useState([])
    const {user} = useAuth()
    const textareaRef = useRef(null)
    const typingTimeoutRef = useRef(null)
    const typingStatusTimeoutRef = useRef(null)

    const reactions = ['👍', '❤️', '😂', '😮', '😢', '😡']

    const addNotification = (message, type = 'info') => {
        const id = Date.now()
        setNotifications(prev => [...prev, { id, message, type }])
    }

    const removeNotification = (id) => {
        setNotifications(prev => prev.filter(notification => notification.id !== id))
    }

    useEffect(() => {
        getMessages();
      
        const unsubscribe = client.subscribe(`databases.${DATABASE_ID}.collections.${COLLECTION_ID_MESSAGES}.documents`, response => {

            if(response.events.includes("databases.*.collections.*.documents.*.create")){
                console.log('A MESSAGE WAS CREATED')
                const newMessage = response.payload
                // Ensure new messages have reactions field
                if (!newMessage.reactions) {
                    newMessage.reactions = JSON.stringify({})
                }
                setMessages(prevState => [newMessage, ...prevState])
            }

            if(response.events.includes("databases.*.collections.*.documents.*.delete")){
                console.log('A MESSAGE WAS DELETED!!!')
                setMessages(prevState => prevState.filter(message => message.$id !== response.payload.$id))
            }

            if(response.events.includes("databases.*.collections.*.documents.*.update")){
                console.log('A MESSAGE WAS UPDATED!!!')
                const updatedMessage = response.payload
                // Ensure updated messages have reactions field
                if (!updatedMessage.reactions) {
                    updatedMessage.reactions = JSON.stringify({})
                }
                setMessages(prevState => prevState.map(message => 
                    message.$id === updatedMessage.$id ? updatedMessage : message
                ))
            }
        });

        console.log('unsubscribe:', unsubscribe)
      
        return () => {
          unsubscribe();
        };
      }, []);

    // Subscribe to typing status changes
    useEffect(() => {
        // Subscribe to typing status updates
        const unsubscribeTyping = client.subscribe(
            `databases.${DATABASE_ID}.collections.${TYPING_COLLECTION_ID}.documents`,
            response => {
                // Only interested in create/update events
                if (
                    response.events.some(event => event.includes('create')) ||
                    response.events.some(event => event.includes('update'))
                ) {
                    const doc = response.payload;
                    setTypingUsers(prev => {
                        // Remove if already exists
                        const filtered = prev.filter(u => u.user_id !== doc.user_id);
                        // Only add if isTyping and not self
                        if (doc.isTyping && doc.user_id !== user.$id) {
                            return [...filtered, doc];
                        } else {
                            return filtered;
                        }
                    });
                }
                // Remove on delete
                if (response.events.some(event => event.includes('delete'))) {
                    const doc = response.payload;
                    setTypingUsers(prev => prev.filter(u => u.user_id !== doc.user_id));
                }
            }
        );
        return () => {
            unsubscribeTyping();
        };
    }, [user.$id]);

    const getMessages = async () => {
        const response = await databases.listDocuments(
            DATABASE_ID,
            COLLECTION_ID_MESSAGES,
            [
                Query.orderDesc('$createdAt'),
                Query.limit(100),
            ]
        )
        console.log(response.documents)
        
        // Initialize reactions field for messages that don't have it
        const messagesWithReactions = response.documents.map(message => {
            if (!message.reactions) {
                // Initialize with empty reactions object
                message.reactions = JSON.stringify({})
            }
            return message
        })
        
        setMessages(messagesWithReactions)
    }

    // Function to initialize reactions for a single message
    const initializeReactions = async (messageId) => {
        try {
            await databases.updateDocument(
                DATABASE_ID,
                COLLECTION_ID_MESSAGES,
                messageId,
                { reactions: JSON.stringify({}) }
            )
            console.log('Initialized reactions for message:', messageId)
        } catch (error) {
            console.error('Error initializing reactions:', error)
        }
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        console.log('MESSAGE:', messageBody)

        const permissions = [
            Permission.read(Role.users()),   // All authenticated users can read
            Permission.write(Role.users()),  // All authenticated users can write
        ]

        const payload = {
            user_id:user.$id,
            username:user.name,
            body:messageBody,
            reactions: JSON.stringify({})
        }

        try {
        const response = await databases.createDocument(
                DATABASE_ID, 
                COLLECTION_ID_MESSAGES, 
                ID.unique(), 
                payload,
                permissions
            )

        console.log('RESPONSE:', response)
            addNotification('Message sent successfully!', 'success')
        } catch (error) {
            console.error('Error sending message:', error)
            addNotification('Failed to send message', 'error')
        }

        setMessageBody('')
        setIsTyping(false)
    }

    const deleteMessage = async (id) => {
        try {
        await databases.deleteDocument(DATABASE_ID, COLLECTION_ID_MESSAGES, id);
            addNotification('Message deleted successfully!', 'success')
        } catch (error) {
            console.error('Error deleting message:', error)
            addNotification('Failed to delete message', 'error')
        }
    }

    // Helper to set typing status in Appwrite
    const setTypingStatus = async (isTyping) => {
        if (!user) return;
        try {
            // Try to update, if fails (not exists), create
            await databases.updateDocument(
                DATABASE_ID,
                TYPING_COLLECTION_ID,
                user.$id,
                {
                    user_id: user.$id,
                    username: user.name,
                    isTyping,
                    room_id: 'main', // or your room logic
                    updatedAt: new Date().toISOString()
                }
            );
        } catch (err) {
            // If not found, create
            try {
                await databases.createDocument(
                    DATABASE_ID,
                    TYPING_COLLECTION_ID,
                    user.$id,
                    {
                        user_id: user.$id,
                        username: user.name,
                        isTyping,
                        room_id: 'main',
                        updatedAt: new Date().toISOString()
                    },
                    [
                        Permission.read(Role.users()),
                        Permission.write(Role.users())
                    ]
                );
            } catch (e) {
                // Ignore if still fails
            }
        }
    };

    const handleTyping = (e) => {
        setMessageBody(e.target.value)
        if (!isTyping) {
            setIsTyping(true)
            setTypingStatus(true)
        }
        // Clear existing timeout
        if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current)
        }
        // Set new timeout
        typingTimeoutRef.current = setTimeout(() => {
            setIsTyping(false)
            setTypingStatus(false)
        }, 2000)
    }

    const addReaction = async (messageId, reaction) => {
        const message = messages.find(m => m.$id === messageId)
        if (!message) return

        // If message doesn't have reactions field, initialize it first
        if (!message.reactions) {
            await initializeReactions(messageId)
            // Update the local message object
            message.reactions = JSON.stringify({})
        }
        
        const currentReactions = message.reactions ? JSON.parse(message.reactions) : {}
        const userReactions = currentReactions[user.$id] || []
        
        if (userReactions.includes(reaction)) {
            // Remove reaction if already exists
            const updatedReactions = userReactions.filter(r => r !== reaction)
            if (updatedReactions.length === 0) {
                delete currentReactions[user.$id]
            } else {
                currentReactions[user.$id] = updatedReactions
            }
        } else {
            // Add reaction
            currentReactions[user.$id] = [...userReactions, reaction]
        }

        try {
            const updatePayload = { reactions: JSON.stringify(currentReactions) }
            
            await databases.updateDocument(
                DATABASE_ID,
                COLLECTION_ID_MESSAGES,
                messageId,
                updatePayload
            )
            
            const action = userReactions.includes(reaction) ? 'removed' : 'added'
            addNotification(`Reaction ${action}!`, 'success')
        } catch (error) {
            console.error('Error updating reaction:', error)
            addNotification('Failed to update reaction', 'error')
        }

        setShowReactionPicker(null)
    }

    const getReactionCounts = (reactionsStr) => {
        console.log('Getting reaction counts for:', reactionsStr)
        if (!reactionsStr) {
            console.log('No reactions string, returning empty object')
            return {}
        }
        
        try {
            const reactions = JSON.parse(reactionsStr)
            console.log('Parsed reactions for counting:', reactions)
            const counts = {}
            
            Object.values(reactions).flat().forEach(reaction => {
                counts[reaction] = (counts[reaction] || 0) + 1
            })
            
            console.log('Calculated counts:', counts)
            return counts
        } catch (error) {
            console.error('Error parsing reactions for counting:', error)
            return {}
        }
    }

    const hasUserReacted = (reactionsStr, reaction) => {
        if (!reactionsStr) return false
        
        try {
            const reactions = JSON.parse(reactionsStr)
            const userReactions = reactions[user.$id] || []
            return userReactions.includes(reaction)
        } catch (error) {
            return false
        }
     } 

    // On unmount, set typing status to false
    useEffect(() => {
        return () => {
            setTypingStatus(false)
        }
    }, [])

  return (
    <main className="container">
        <Header/>
        <div className="room--container">

        <form id="message--form" onSubmit={handleSubmit}>
            <div>
                <textarea 
                        ref={textareaRef}
                    required 
                        maxLength="250"
                    placeholder="Say something..." 
                        onChange={handleTyping}
                    value={messageBody}
                    ></textarea>
            </div>

            <div className="send-btn--wrapper">
                <input className="btn btn--secondary" type="submit" value="send"/>
            </div>
        </form>

            {isTyping && (
                <div className="typing-indicator">
                    <span>You are typing</span>
                    <div className="typing-dots">
                        <div className="typing-dot"></div>
                        <div className="typing-dot"></div>
                        <div className="typing-dot"></div>
                    </div>
                </div>
            )}

            {typingUsers.length > 0 && (
                <div className="typing-indicator">
                    <span>{typingUsers.map(u => u.username).join(', ')} {typingUsers.length === 1 ? 'is' : 'are'} typing...</span>
                </div>
            )}

        <div>
                {messages.map(message => {
                    const reactionCounts = getReactionCounts(message.reactions)
                    const isOwner = message.user_id === user.$id
                    
                    return (
                <div key={message.$id} className={"message--wrapper"}>
                    <div className="message--header">
                        <p> 
                            {message?.username ? (
                                <span> {message?.username}</span>
                            ): (
                                'Anonymous user'
                            )}
                         
                                    <small className="message-timestamp" title={formatFullTime(message.$createdAt)}>
                                        {formatMessageTime(message.$createdAt)}
                                    </small>
                        </p>

                                <div className="message-actions">
                                    <button 
                                        className="action-btn" 
                                        onClick={() => {
                                            const newValue = showReactionPicker === message.$id ? null : message.$id
                                            setShowReactionPicker(newValue)
                                        }}
                                    >
                                        <Smile size={14} />
                                    </button>
                                    
                                    {isOwner && (
                            <Trash2 className="delete--btn" onClick={() => {deleteMessage(message.$id)}}/>
                        )}
                                </div>
                    </div>

                            <div className={"message--body" + (isOwner ? ' message--body--owner' : '')}>
                        <span>{message.body}</span>
                    </div>
                        
                            {/* Move reaction picker here, outside of message-actions */}
                            {showReactionPicker === message.$id && (
                                <div 
                                    style={{
                                        backgroundColor: 'var(--secondaryBgColor)',
                                        border: '1px solid var(--borderColor1)',
                                        borderRadius: '8px',
                                        padding: '6px',
                                        margin: '4px 0',
                                        display: 'flex',
                                        gap: '2px',
                                        flexWrap: 'wrap',
                                        justifyContent: 'center',
                                        minWidth: '120px',
                                        maxWidth: '140px',
                                        zIndex: 99999,
                                        position: 'relative',
                                        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                                        animation: 'slideDown 0.2s ease-out'
                                    }}
                                >
                                    {reactions.map(reaction => {
                                        return (
                                            <span 
                                                key={reaction}
                                                style={{
                                                    cursor: 'pointer',
                                                    padding: '3px',
                                                    borderRadius: '4px',
                                                    fontSize: '14px',
                                                    userSelect: 'none',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    minWidth: '24px',
                                                    minHeight: '24px',
                                                    backgroundColor: 'transparent',
                                                    border: '1px solid transparent',
                                                    margin: '1px',
                                                    transition: 'all 0.2s ease',
                                                    opacity: 0.8
                                                }}
                                                onMouseEnter={(e) => {
                                                    e.target.style.backgroundColor = 'var(--borderColor1)'
                                                    e.target.style.opacity = '1'
                                                    e.target.style.transform = 'scale(1.1)'
                                                }}
                                                onMouseLeave={(e) => {
                                                    e.target.style.backgroundColor = 'transparent'
                                                    e.target.style.opacity = '0.8'
                                                    e.target.style.transform = 'scale(1)'
                                                }}
                                                onClick={(e) => {
                                                    e.stopPropagation()
                                                    addReaction(message.$id, reaction)
                                                }}
                                            >
                                                {reaction}
                                            </span>
                                        )
                                    })}
                                </div>
                            )}

                            {Object.keys(reactionCounts).length > 0 && (
                                <div className="message-reactions">
                                    {Object.entries(reactionCounts).map(([reaction, count]) => (
                                        <span 
                                            key={reaction}
                                            className={`reaction ${hasUserReacted(message.reactions, reaction) ? 'user-reacted' : ''}`}
                                            onClick={() => addReaction(message.$id, reaction)}
                                        >
                                            {reaction}
                                            <span className="reaction-count">{count}</span>
                                        </span>
                                    ))}
                                </div>
                            )}
                        </div>
                    )
                })}
            </div>
        </div> {/* End of .room--container */}

        {/* Notifications */}
        {notifications.map(notification => (
            <Notification
                key={notification.id}
                message={notification.message}
                type={notification.type}
                onClose={() => removeNotification(notification.id)}
            />
        ))}
    </main>
  )
}

export default Room
