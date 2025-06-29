import React, { useState, useEffect } from 'react'
import { useAuth } from '../utils/AuthContext'
import { Link } from 'react-router-dom'
import { LogOut, LogIn, Sun, Moon } from 'react-feather'

const Header = () => {
    const {user, handleLogout} = useAuth()
    const [theme, setTheme] = useState('dark')
    const [isOnline, setIsOnline] = useState(true)

    useEffect(() => {
        // Load theme from localStorage
        const savedTheme = localStorage.getItem('theme') || 'dark'
        setTheme(savedTheme)
        document.documentElement.setAttribute('data-theme', savedTheme)
    }, [])

    useEffect(() => {
        // Check online status
        const handleOnline = () => setIsOnline(true)
        const handleOffline = () => setIsOnline(false)
        
        window.addEventListener('online', handleOnline)
        window.addEventListener('offline', handleOffline)
        
        return () => {
            window.removeEventListener('online', handleOnline)
            window.removeEventListener('offline', handleOffline)
        }
    }, [])

    const toggleTheme = () => {
        const newTheme = theme === 'dark' ? 'light' : 'dark'
        setTheme(newTheme)
        localStorage.setItem('theme', newTheme)
        document.documentElement.setAttribute('data-theme', newTheme)
    }

    const formatTime = () => {
        return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }

    return (
        <div id="header--wrapper">
            {user ? (
                <>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div className="user-status">
                            <div className="status-indicator" style={{ backgroundColor: isOnline ? '#28a745' : '#dc3545' }}></div>
                            <span>{user.name}</span>
                            {isOnline && <small>({formatTime()})</small>}
                        </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <button className="theme-toggle" onClick={toggleTheme}>
                            {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
                        </button>
                        <LogOut className="header--link" onClick={handleLogout}/>
                    </div>
                </>
            ): (
                <>
                    <div></div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <button className="theme-toggle" onClick={toggleTheme}>
                            {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
                        </button>
                        <Link to="/">
                            <LogIn className="header--link"/>
                        </Link>
                    </div>
                </>
            )}
        </div>
    )
}

export default Header
