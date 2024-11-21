export interface SignalingMessage {
    type: 'offer' | 'answer' | 'ice-candidate' | 'game-message';
    sender: string;
    receiver?: string;
    data: any;
}

export class SignalingServer {
    private connections: Map<string, RTCPeerConnection> = new Map();
    private dataChannels: Map<string, RTCDataChannel> = new Map();
    private onMessageCallback: ((message: any) => void) | null = null;

    constructor() {
        this.setupHostPeer();
    }

    public isConnected(peerId: string): boolean {
        const channel = this.dataChannels.get(peerId);
        return channel?.readyState === 'open';
    }

    public sendToPeer(peerId: string, message: any): boolean {
        const channel = this.dataChannels.get(peerId);
        if (channel?.readyState === 'open') {
            channel.send(JSON.stringify(message));
            return true;
        }
        return false;
    }

    private async setupHostPeer() {
        const configuration = { 
            iceServers: [
                { urls: 'stun:stun.l.google.com:19302' }
            ]
        };

        // Create WebSocket server for initial signaling
        const ws = new WebSocket('ws://localhost:3000');

        ws.onmessage = async (event) => {
            const message: SignalingMessage = JSON.parse(event.data);
            
            if (message.type === 'offer') {
                const peerConnection = new RTCPeerConnection(configuration);
                this.setupPeerConnection(peerConnection, message.sender);
                
                // Set the remote description from the offer
                await peerConnection.setRemoteDescription(new RTCSessionDescription(message.data));
                
                // Create and send answer
                const answer = await peerConnection.createAnswer();
                await peerConnection.setLocalDescription(answer);
                
                ws.send(JSON.stringify({
                    type: 'answer',
                    sender: 'host',
                    receiver: message.sender,
                    data: answer
                }));
            } else if (message.type === 'ice-candidate' && message.receiver === 'host') {
                const peerConnection = this.connections.get(message.sender);
                if (peerConnection) {
                    await peerConnection.addIceCandidate(new RTCIceCandidate(message.data));
                }
            }
        };
    }

    private setupPeerConnection(peerConnection: RTCPeerConnection, peerId: string) {
        this.connections.set(peerId, peerConnection);

        // Create data channel
        const dataChannel = peerConnection.createDataChannel('gameData');
        this.setupDataChannel(dataChannel, peerId);

        peerConnection.onicecandidate = (event) => {
            if (event.candidate) {
                this.sendSignalingMessage({
                    type: 'ice-candidate',
                    sender: 'host',
                    receiver: peerId,
                    data: event.candidate
                });
            }
        };

        peerConnection.ondatachannel = (event) => {
            this.setupDataChannel(event.channel, peerId);
        };
    }

    private setupDataChannel(dataChannel: RTCDataChannel, peerId: string) {
        this.dataChannels.set(peerId, dataChannel);

        dataChannel.onmessage = (event) => {
            if (this.onMessageCallback) {
                this.onMessageCallback(JSON.parse(event.data));
            }
        };

        dataChannel.onopen = () => {
            console.log(`Data channel opened with peer ${peerId}`);
        };

        dataChannel.onclose = () => {
            console.log(`Data channel closed with peer ${peerId}`);
            this.connections.delete(peerId);
            this.dataChannels.delete(peerId);
        };
    }

    public broadcast(message: any) {
        const messageStr = JSON.stringify(message);
        this.dataChannels.forEach(channel => {
            if (channel.readyState === 'open') {
                channel.send(messageStr);
            }
        });
    }

    public onMessage(callback: (message: any) => void) {
        this.onMessageCallback = callback;
    }

    public getConnectedPeers(): string[] {
        return Array.from(this.dataChannels.entries())
            .filter(([_, channel]) => channel.readyState === 'open')
            .map(([peerId]) => peerId);
    }

    private sendSignalingMessage(message: SignalingMessage) {
        // Send through WebSocket for signaling
        const ws = new WebSocket('ws://localhost:3000');
        ws.send(JSON.stringify(message));
    }
} 