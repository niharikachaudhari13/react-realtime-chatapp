// Time formatting utilities
export const formatMessageTime = (timestamp) => {
    const now = new Date()
    const messageTime = new Date(timestamp)
    const diffInMinutes = Math.floor((now - messageTime) / (1000 * 60))
    const diffInHours = Math.floor(diffInMinutes / 60)
    const diffInDays = Math.floor(diffInHours / 24)

    if (diffInMinutes < 1) {
        return 'Just now'
    } else if (diffInMinutes < 60) {
        return `${diffInMinutes}m ago`
    } else if (diffInHours < 24) {
        return `${diffInHours}h ago`
    } else if (diffInDays < 7) {
        return `${diffInDays}d ago`
    } else {
        return messageTime.toLocaleDateString()
    }
}

export const formatFullTime = (timestamp) => {
    const messageTime = new Date(timestamp)
    const now = new Date()
    const isToday = messageTime.toDateString() === now.toDateString()
    
    if (isToday) {
        return messageTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    } else {
        return messageTime.toLocaleDateString() + ' ' + messageTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
} 