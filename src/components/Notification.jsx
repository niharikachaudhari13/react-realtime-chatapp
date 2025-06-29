import React, { useState, useEffect } from 'react'
import { CheckCircle, AlertCircle, X } from 'react-feather'

const Notification = ({ message, type = 'info', duration = 3000, onClose }) => {
    const [isVisible, setIsVisible] = useState(true)

    useEffect(() => {
        const timer = setTimeout(() => {
            setIsVisible(false)
            setTimeout(() => onClose(), 300) // Wait for animation to complete
        }, duration)

        return () => clearTimeout(timer)
    }, [duration, onClose])

    const getIcon = () => {
        switch (type) {
            case 'success':
                return <CheckCircle size={16} />
            case 'error':
                return <AlertCircle size={16} />
            default:
                return null
        }
    }

    const getTypeStyles = () => {
        switch (type) {
            case 'success':
                return { backgroundColor: '#28a745', color: 'white' }
            case 'error':
                return { backgroundColor: '#dc3545', color: 'white' }
            default:
                return { backgroundColor: 'var(--themeColorSecondary)', color: 'white' }
        }
    }

    return (
        <div 
            className={`notification ${isVisible ? 'notification--visible' : 'notification--hidden'}`}
            style={getTypeStyles()}
        >
            <div className="notification--content">
                {getIcon()}
                <span>{message}</span>
            </div>
            <button 
                className="notification--close"
                onClick={() => {
                    setIsVisible(false)
                    setTimeout(() => onClose(), 300)
                }}
            >
                <X size={14} />
            </button>
        </div>
    )
}

export default Notification 