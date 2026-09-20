import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { Socket } from 'socket.io-client';
import { getSocket } from '../services/socket.js';
import { useAuth } from './AuthContext.js';

export interface IPairedScanner {
  deviceId: string;
  connectedAt: string;
  lastScanAt?: string;
}

export interface IScanPayload {
  qrId: string;
  rawScan: string;
  scannedAt: string;
  deskNumber: number;
  deviceId: string;
  status: 'UNUSED' | 'ALREADY_ALLOCATED' | 'INVALID_QR';
  message: string;
  allocatedTo?: {
    teamName: string;
    collegeName: string;
    teamLeader: string;
    allocatedAt: string;
    deskNumber: number;
  };
}

interface SocketContextType {
  socket: Socket;
  pairedScanner: IPairedScanner | null;
  lastScanReceived: IScanPayload | null;
  clearLastScan: () => void;
  isConnected: boolean;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

export const SocketProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { deskNumber } = useAuth();
  const [socket] = useState<Socket>(() => getSocket());
  const [isConnected, setIsConnected] = useState<boolean>(socket.connected);
  const [pairedScanner, setPairedScanner] = useState<IPairedScanner | null>(null);
  const [lastScanReceived, setLastScanReceived] = useState<IScanPayload | null>(null);

  useEffect(() => {
    const handleConnect = () => setIsConnected(true);
    const handleDisconnect = () => setIsConnected(false);

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);

    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
    };
  }, [socket]);

  // Join desk room whenever deskNumber changes
  useEffect(() => {
    if (!deskNumber) return;

    console.log(`[Socket] Joining desk room desk-${deskNumber}`);
    socket.emit('join-desk', { deskNumber });

    const handleDeskStatus = (data: { deskNumber: number; pairedScanner: IPairedScanner | null }) => {
      if (data.deskNumber === deskNumber) {
        setPairedScanner(data.pairedScanner);
      }
    };

    const handleScannerConnected = (data: { deskNumber: number; deviceId: string; connectedAt: string }) => {
      if (data.deskNumber === deskNumber) {
        setPairedScanner({
          deviceId: data.deviceId,
          connectedAt: data.connectedAt,
        });
      }
    };

    const handleScannerDisconnected = (data: { deskNumber: number }) => {
      if (data.deskNumber === deskNumber) {
        setPairedScanner(null);
      }
    };

    const handleQRScan = (payload: IScanPayload) => {
      if (payload.deskNumber === deskNumber) {
        console.log(`[Socket] Received QR scan for desk ${deskNumber}:`, payload);
        setLastScanReceived(payload);
      }
    };

    socket.on('desk-status', handleDeskStatus);
    socket.on('scanner-connected', handleScannerConnected);
    socket.on('scanner-disconnected', handleScannerDisconnected);
    socket.on('qr-scan-received', handleQRScan);

    return () => {
      socket.off('desk-status', handleDeskStatus);
      socket.off('scanner-connected', handleScannerConnected);
      socket.off('scanner-disconnected', handleScannerDisconnected);
      socket.off('qr-scan-received', handleQRScan);
    };
  }, [socket, deskNumber]);

  const clearLastScan = () => {
    setLastScanReceived(null);
  };

  return (
    <SocketContext.Provider
      value={{
        socket,
        pairedScanner,
        lastScanReceived,
        clearLastScan,
        isConnected,
      }}
    >
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = (): SocketContextType => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};
