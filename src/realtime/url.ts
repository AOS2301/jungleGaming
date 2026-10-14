/** Origem do servidor Socket.IO (mesma origem por padrão; configurável por VITE_SOCKET_URL). */
export const socketOrigin = (): string => import.meta.env.VITE_SOCKET_URL || window.location.origin
