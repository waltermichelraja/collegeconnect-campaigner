import { useState, useCallback } from "react"

let _addToast = null

export function useToast() {
    const [toasts, setToasts] = useState([])

    const addToast = useCallback((message, type = "info", duration = 3500) => {
        const id = Date.now()
        setToasts(prev => [...prev, { id, message, type }])
        setTimeout(() => {
            setToasts(prev => prev.filter(t => t.id !== id))
        }, duration)
    }, [])

    _addToast = addToast

    return { toasts, addToast }
}

export function toast(message, type = "info") {
    if (_addToast) _addToast(message, type)
}

export function ToastContainer({ toasts }) {
    const icons = {
        success: (
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
                stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 6L9 17l-5-5"/>
            </svg>
        ),
        error: (
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
                stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/>
                <path d="M12 8v4M12 16h.01"/>
            </svg>
        ),
        info: (
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
                stroke="#3b82f6" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/>
                <path d="M12 16v-4M12 8h.01"/>
            </svg>
        )
    }

    return (
        <div className="toast-container">
            {toasts.map(t => (
                <div key={t.id} className={`toast ${t.type}`}>
                    {icons[t.type]}
                    {t.message}
                </div>
            ))}
        </div>
    )
}