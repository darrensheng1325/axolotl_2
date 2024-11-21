(()=>{"use strict";const e={},t=[],a=[],n=[],s=1e4,o=2e3,i={common:{health:5,speed:.5,damage:5,probability:.4,color:"#808080"},uncommon:{health:40,speed:.75,damage:10,probability:.3,color:"#008000"},rare:{health:60,speed:1,damage:15,probability:.15,color:"#0000FF"},epic:{health:80,speed:1.25,damage:20,probability:.1,color:"#800080"},legendary:{health:100,speed:1.5,damage:25,probability:.04,color:"#FFA500"},mythic:{health:150,speed:2,damage:30,probability:.01,color:"#FF0000"}},r={common:{start:0,end:2e3},uncommon:{start:2e3,end:4e3},rare:{start:4e3,end:6e3},epic:{start:6e3,end:8e3},legendary:{start:8e3,end:9e3},mythic:{start:9e3,end:s}},h={common:1,uncommon:1.2,rare:1.4,epic:1.6,legendary:1.8,mythic:2},l=[];function c(){const e=function(e){const t=s/6,a=e*t;if(e>=4){const a=s-t/2*(6-e);return{x:a+Math.random()*(s-a),y:Math.random()*o}}return{x:a+Math.random()*t,y:Math.random()*o}}(Math.floor(6*Math.random()));return{x:e.x,y:e.y,scale:.5+1.5*Math.random()}}function d(){const e=s;return{x:l.length*e+Math.random()*e,y:Math.random()*o,radius:50+70*Math.random(),rotation:Math.random()*Math.PI*2}}var m=function(e,t,a,n){return new(a||(a=Promise))((function(s,o){function i(e){try{h(n.next(e))}catch(e){o(e)}}function r(e){try{h(n.throw(e))}catch(e){o(e)}}function h(e){var t;e.done?s(e.value):(t=e.value,t instanceof a?t:new a((function(e){e(t)}))).then(i,r)}h((n=n.apply(e,t||[])).next())}))};class p{constructor(){this.connections=new Map,this.dataChannels=new Map,this.onMessageCallback=null,this.setupHostPeer()}isConnected(e){const t=this.dataChannels.get(e);return"open"===(null==t?void 0:t.readyState)}sendToPeer(e,t){const a=this.dataChannels.get(e);return"open"===(null==a?void 0:a.readyState)&&(a.send(JSON.stringify(t)),!0)}setupHostPeer(){return m(this,void 0,void 0,(function*(){const e={iceServers:[{urls:"stun:stun.l.google.com:19302"}]},t=new WebSocket("ws://localhost:3000");t.onmessage=a=>m(this,void 0,void 0,(function*(){const n=JSON.parse(a.data);if("offer"===n.type){const a=new RTCPeerConnection(e);this.setupPeerConnection(a,n.sender),yield a.setRemoteDescription(new RTCSessionDescription(n.data));const s=yield a.createAnswer();yield a.setLocalDescription(s),t.send(JSON.stringify({type:"answer",sender:"host",receiver:n.sender,data:s}))}else if("ice-candidate"===n.type&&"host"===n.receiver){const e=this.connections.get(n.sender);e&&(yield e.addIceCandidate(new RTCIceCandidate(n.data)))}}))}))}setupPeerConnection(e,t){this.connections.set(t,e);const a=e.createDataChannel("gameData");this.setupDataChannel(a,t),e.onicecandidate=e=>{e.candidate&&this.sendSignalingMessage({type:"ice-candidate",sender:"host",receiver:t,data:e.candidate})},e.ondatachannel=e=>{this.setupDataChannel(e.channel,t)}}setupDataChannel(e,t){this.dataChannels.set(t,e),e.onmessage=e=>{this.onMessageCallback&&this.onMessageCallback(JSON.parse(e.data))},e.onopen=()=>{console.log(`Data channel opened with peer ${t}`)},e.onclose=()=>{console.log(`Data channel closed with peer ${t}`),this.connections.delete(t),this.dataChannels.delete(t)}}broadcast(e){const t=JSON.stringify(e);this.dataChannels.forEach((e=>{"open"===e.readyState&&e.send(t)}))}onMessage(e){this.onMessageCallback=e}getConnectedPeers(){return Array.from(this.dataChannels.entries()).filter((([e,t])=>"open"===t.readyState)).map((([e])=>e))}sendSignalingMessage(e){new WebSocket("ws://localhost:3000").send(JSON.stringify(e))}}const u=new class{constructor(){this.connections=new Map,this.isRunning=!1,this.decorations=[],this.sands=[],this.ENEMY_COUNT=200,this.signalingServer=null,this.initializeGameState()}calculateXPRequirement(e){return Math.floor(100*Math.pow(1.5,e-1))}initializeGameState(){for(let e=0;e<this.ENEMY_COUNT;e++)t.push(this.createEnemy());for(let e=0;e<20;e++)a.push(this.createObstacle());for(let e=0;e<100;e++)this.decorations.push(c());for(let e=0;e<50;e++)this.sands.push(d())}start(){if(!this.isRunning)try{this.signalingServer=new p,this.signalingServer.onMessage((e=>{this.handleMessage(e)})),this.isRunning=!0,this.startGameLoops(),this.postMessage("status",{online:!0}),this.postMessage("log","Server started successfully")}catch(e){const t=e instanceof Error?e.message:"Unknown error";this.postMessage("log",`Failed to start server: ${t}`)}}handleMessage(e){try{switch(e.type){case"authenticate":this.handleAuthentication(e.data);break;case"playerMovement":this.handlePlayerMovement(e.data)}}catch(e){console.error("Error handling message:",e)}}handleAuthentication(s){var o,i;const r={id:Math.random().toString(36).substr(2,9),peerId:s.userId,userId:s.userId,username:s.username};(null===(o=this.signalingServer)||void 0===o?void 0:o.isConnected(r.peerId))?(this.connections.set(r.id,r),e[r.id]={id:r.id,name:s.playerName||"Anonymous",x:200,y:1e3,angle:0,score:0,velocityX:0,velocityY:0,health:100,maxHealth:100,damage:5,inventory:[],loadout:Array(10).fill(null),isInvulnerable:!0,level:1,xp:0,xpToNextLevel:this.calculateXPRequirement(1)},null===(i=this.signalingServer)||void 0===i||i.sendToPeer(r.peerId,{type:"authenticated",data:{playerId:r.id,gameState:{players:e,enemies:t,items:n,obstacles:a,decorations:this.decorations,sands:this.sands}}}),this.broadcast({type:"playerJoined",data:e[r.id]})):this.postMessage("log",`Failed to authenticate user ${r.username}: No peer connection`)}broadcast(e){this.signalingServer&&this.signalingServer.broadcast(e)}stop(){this.isRunning&&(this.connections.clear(),this.isRunning=!1,this.signalingServer=null,this.postMessage("status",{online:!1}),this.postMessage("log","Server stopped"))}startGameLoops(){setInterval((()=>{this.moveEnemies(),this.updateStats(),this.broadcast({type:"gameState",data:{players:e,enemies:t,items:n}})}),100),setInterval((()=>{Object.values(e).forEach((e=>{e.health<e.maxHealth&&(e.health=Math.min(e.maxHealth,e.health+5))}))}),1e3)}createEnemy(){const e=Math.random()*s;let t="common";for(const[a,n]of Object.entries(r))if(e>=n.start&&e<n.end){t=a;break}const a=i[t];return{id:Math.random().toString(36).substr(2,9),type:Math.random()<.5?"octopus":"fish",tier:t,x:e,y:Math.random()*o,angle:Math.random()*Math.PI*2,health:a.health,speed:a.speed,damage:a.damage,knockbackX:0,knockbackY:0}}createObstacle(){const e=Math.random()<.3;return{id:Math.random().toString(36).substr(2,9),x:Math.random()*s,y:Math.random()*o,width:50+50*Math.random(),height:50+50*Math.random(),type:"coral",isEnemy:e,health:e?50:void 0}}moveEnemies(){}updateStats(){this.postMessage("stats",{players:Object.keys(e).length,enemies:t.length})}postMessage(e,t){self.postMessage({type:e,data:t})}handlePlayerMovement(a){const n=e[a.id];if(n){n.x=Math.max(0,Math.min(9960,a.x)),n.y=Math.max(0,Math.min(1960,a.y)),n.angle=a.angle,n.velocityX=a.velocityX,n.velocityY=a.velocityY;for(const a of t){const t=40*h[a.tier];if(n.x<a.x+t&&n.x+40>a.x&&n.y<a.y+t&&n.y+40>a.y&&!n.isInvulnerable){n.health-=a.damage;const t=a.x-n.x,s=a.y-n.y,o=Math.sqrt(t*t+s*s),i=t/o,r=s/o;n.x-=20*i,n.y-=20*r,n.health<=0&&(this.broadcast({type:"playerDied",data:{playerId:n.id}}),n.health=n.maxHealth,n.x=200,n.y=1e3,n.isInvulnerable=!0,setTimeout((()=>{e[n.id]&&(e[n.id].isInvulnerable=!1)}),3e3))}}this.broadcast({type:"playerMoved",data:n})}}};self.onmessage=function(e){const{type:t,data:a}=e.data;switch(t){case"start":u.start();break;case"stop":u.stop();break;default:console.warn("Unknown message type:",t)}}})();