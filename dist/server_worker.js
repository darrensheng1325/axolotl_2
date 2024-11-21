(()=>{"use strict";const e={},t=[],a=[],s=[],n=1e4,o=2e3,r={common:{health:5,speed:.5,damage:5,probability:.4,color:"#808080"},uncommon:{health:40,speed:.75,damage:10,probability:.3,color:"#008000"},rare:{health:60,speed:1,damage:15,probability:.15,color:"#0000FF"},epic:{health:80,speed:1.25,damage:20,probability:.1,color:"#800080"},legendary:{health:100,speed:1.5,damage:25,probability:.04,color:"#FFA500"},mythic:{health:150,speed:2,damage:30,probability:.01,color:"#FF0000"}},i={common:{start:0,end:2e3},uncommon:{start:2e3,end:4e3},rare:{start:4e3,end:6e3},epic:{start:6e3,end:8e3},legendary:{start:8e3,end:9e3},mythic:{start:9e3,end:n}},h={common:1,uncommon:1.2,rare:1.4,epic:1.6,legendary:1.8,mythic:2},l=[];function c(){const e=function(e){const t=n/6,a=e*t;if(e>=4){const a=n-t/2*(6-e);return{x:a+Math.random()*(n-a),y:Math.random()*o}}return{x:a+Math.random()*t,y:Math.random()*o}}(Math.floor(6*Math.random()));return{x:e.x,y:e.y,scale:.5+1.5*Math.random()}}function d(){const e=n;return{x:l.length*e+Math.random()*e,y:Math.random()*o,radius:50+70*Math.random(),rotation:Math.random()*Math.PI*2}}const m=new class{constructor(){this.connections=new Map,this.isRunning=!1,this.decorations=[],this.sands=[],this.ENEMY_COUNT=200,this.wsServer=null,this.initializeGameState()}calculateXPRequirement(e){return Math.floor(100*Math.pow(1.5,e-1))}initializeGameState(){for(let e=0;e<this.ENEMY_COUNT;e++)t.push(this.createEnemy());for(let e=0;e<20;e++)a.push(this.createObstacle());for(let e=0;e<100;e++)this.decorations.push(c());for(let e=0;e<50;e++)this.sands.push(d())}start(){if(!this.isRunning)try{this.wsServer=new WebSocket("ws://localhost:3000"),this.wsServer.onopen=()=>{this.isRunning=!0,this.startGameLoops(),this.postMessage("status",{online:!0}),this.postMessage("log","Server started successfully")},this.wsServer.onclose=()=>{this.stop()},this.wsServer.onmessage=this.handleMessage.bind(this)}catch(e){const t=e instanceof Error?e.message:"Unknown error";this.postMessage("log",`Failed to start server: ${t}`)}}handleMessage(e){try{const t=JSON.parse(e.data);switch(t.type){case"authenticate":this.handleAuthentication(t.data);break;case"playerMovement":this.handlePlayerMovement(t.data)}}catch(e){console.error("Error handling message:",e)}}handleAuthentication(t){const a={id:Math.random().toString(36).substr(2,9),socket:this.wsServer,userId:t.userId,username:t.username};this.connections.set(a.id,a),e[a.id]={id:a.id,name:t.playerName||"Anonymous",x:200,y:1e3,angle:0,score:0,velocityX:0,velocityY:0,health:100,maxHealth:100,damage:5,inventory:[],loadout:Array(10).fill(null),isInvulnerable:!0,level:1,xp:0,xpToNextLevel:this.calculateXPRequirement(1)},this.broadcast({type:"playerJoined",data:e[a.id]})}broadcast(e){if(!this.wsServer||this.wsServer.readyState!==WebSocket.OPEN)return;const t=JSON.stringify(e);this.wsServer.send(t)}stop(){this.isRunning&&(this.wsServer&&(this.wsServer.close(),this.wsServer=null),this.connections.clear(),this.isRunning=!1,this.postMessage("status",{online:!1}),this.postMessage("log","Server stopped"))}startGameLoops(){setInterval((()=>{this.moveEnemies(),this.updateStats(),this.broadcast({type:"gameState",data:{players:e,enemies:t,items:s}})}),100),setInterval((()=>{Object.values(e).forEach((e=>{e.health<e.maxHealth&&(e.health=Math.min(e.maxHealth,e.health+5))}))}),1e3)}createEnemy(){const e=Math.random()*n;let t="common";for(const[a,s]of Object.entries(i))if(e>=s.start&&e<s.end){t=a;break}const a=r[t];return{id:Math.random().toString(36).substr(2,9),type:Math.random()<.5?"octopus":"fish",tier:t,x:e,y:Math.random()*o,angle:Math.random()*Math.PI*2,health:a.health,speed:a.speed,damage:a.damage,knockbackX:0,knockbackY:0}}createObstacle(){const e=Math.random()<.3;return{id:Math.random().toString(36).substr(2,9),x:Math.random()*n,y:Math.random()*o,width:50+50*Math.random(),height:50+50*Math.random(),type:"coral",isEnemy:e,health:e?50:void 0}}moveEnemies(){}updateStats(){this.postMessage("stats",{players:Object.keys(e).length,enemies:t.length})}postMessage(e,t){self.postMessage({type:e,data:t})}handlePlayerMovement(a){const s=e[a.id];if(s){s.x=Math.max(0,Math.min(9960,a.x)),s.y=Math.max(0,Math.min(1960,a.y)),s.angle=a.angle,s.velocityX=a.velocityX,s.velocityY=a.velocityY;for(const a of t){const t=40*h[a.tier];if(s.x<a.x+t&&s.x+40>a.x&&s.y<a.y+t&&s.y+40>a.y&&!s.isInvulnerable){s.health-=a.damage;const t=a.x-s.x,n=a.y-s.y,o=Math.sqrt(t*t+n*n),r=t/o,i=n/o;s.x-=20*r,s.y-=20*i,s.health<=0&&(this.broadcast({type:"playerDied",data:{playerId:s.id}}),s.health=s.maxHealth,s.x=200,s.y=1e3,s.isInvulnerable=!0,setTimeout((()=>{e[s.id]&&(e[s.id].isInvulnerable=!1)}),3e3))}}this.broadcast({type:"playerMoved",data:s})}}};self.onmessage=function(e){const{type:t,data:a}=e.data;switch(t){case"start":m.start();break;case"stop":m.stop();break;default:console.warn("Unknown message type:",t)}}})();