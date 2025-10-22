import React, { useState, useEffect, useRef } from 'react';

const BirthdayGame = () => {
  const canvasRef = useRef(null);
  const [gamePhase, setGamePhase] = useState('wakeup');
  const [dialog, setDialog] = useState(null);
  const [dialogIndex, setDialogIndex] = useState(0);
  const [flowersCollected, setFlowersCollected] = useState(0);
  const [timeLeft, setTimeLeft] = useState(60);
  
  const gameDataRef = useRef({
    player: { worldX: 400, worldY: 700, speed: 2.5, walkFrame: 0, animTimer: 0 },
    camera: { worldX: 400, worldY: 700 },
    keys: {},
    canMove: false,
    timer: 0,
    wakeupTimer: 0,
    fadeAlpha: 0,
    
    npcs: {
      florist1: { worldX: 420, worldY: 200, talked: false },
      melisa: { worldX: 400, worldY: 100 },
      florist2: { worldX: 400, worldY: 200, talked: false }
    },
    
    flowers: [],
    particles: [],
    
    beePlayer: { x: 200, y: 400, vy: 0, onGround: true, lives: 3, invulnerable: 0, frame: 0, ducking: false },
    bees: [],
    beeTimer: 0,
    
    toys: [],
    toyParticles: [],
    crosshair: { x: 400, y: 300 },
    attempts: 0,
    
    waitingForFinal: false
  });

  useEffect(() => {
    initGame();
  }, []);

  const initGame = () => {
    const flowers = [];
    const types = [
      { emoji: '🌸', color: '#FFB6C1' },
      { emoji: '🌺', color: '#FF69B4' },
      { emoji: '🌻', color: '#FFD700' },
      { emoji: '🌷', color: '#FF6B9D' },
      { emoji: '🌹', color: '#DC143C' }
    ];
    for (let i = 0; i < 15; i++) {
      const t = types[Math.floor(Math.random() * types.length)];
      flowers.push({
        x: 150 + Math.random() * 500,
        y: 200 + Math.random() * 300,
        type: t.emoji,
        color: t.color,
        collected: false,
        scale: 0.8 + Math.random() * 0.4,
        wobble: Math.random() * Math.PI * 2
      });
    }
    gameDataRef.current.flowers = flowers;

    // Arılar - sağdan sola hareket edecek
    const bees = [];
    for (let i = 0; i < 15; i++) {
      bees.push({
        x: 900 + i * 100 + Math.random() * 50,
        y: 100 + Math.random() * 300,
        speed: 2 + Math.random() * 1.5,
        wobble: Math.random() * Math.PI * 2,
        frame: Math.random() * 100
      });
    }
    gameDataRef.current.bees = bees;

    gameDataRef.current.toys = [
      { id: 'bear', emoji: '🧸', name: 'Ayı', x: 100, y: 250, size: 60, vx: 1.2, minX: 50, maxX: 150, color: '#D4A574' },
      { id: 'rabbit', emoji: '🐰', name: 'Tavşan', x: 220, y: 200, size: 55, vx: -1.5, minX: 180, maxX: 260, color: '#FFE4E1' },
      { id: 'squirrel', emoji: '🐿️', name: 'Sincap', x: 340, y: 280, size: 50, vx: 1.8, minX: 300, maxX: 380, color: '#CD853F' },
      { id: 'bird', emoji: '🐦', name: 'Kuş', x: 460, y: 220, size: 45, vx: -1.3, minX: 420, maxX: 500, color: '#87CEEB' },
      { id: 'cat', emoji: '🐱', name: 'Kedi', x: 100, y: 420, size: 58, vx: 1.4, minX: 50, maxX: 150, color: '#FFB6C1' },
      { id: 'dog', emoji: '🐶', name: 'Köpek', x: 220, y: 380, size: 62, vx: -1.6, minX: 180, maxX: 260, color: '#DEB887' },
      { id: 'capybara', emoji: '🦫', name: 'Capybara', x: 340, y: 440, size: 65, vx: 1.1, minX: 300, maxX: 380, color: '#8B7355', isTarget: true },
      { id: 'panda', emoji: '🐼', name: 'Panda', x: 460, y: 400, size: 60, vx: -1.7, minX: 420, maxX: 500, color: '#000000' }
    ];
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    let animationId;

    const handleKeyDown = (e) => {
      const key = e.key.toLowerCase();
      gameDataRef.current.keys[key] = true;
      
      if (gamePhase === 'wakeup' && gameDataRef.current.wakeupTimer > 120) {
        startWalking();
      }
      
      if (gamePhase === 'wake_up2' && gameDataRef.current.wakeupTimer > 120) {
        setGamePhase('walk_to_florist2');
        gameDataRef.current.canMove = true;
        gameDataRef.current.player.worldX = 400;
        gameDataRef.current.player.worldY = 600;
      }
      
      if (gamePhase === 'black_screen' && gameDataRef.current.waitingForFinal) {
        setGamePhase('final');
        gameDataRef.current.waitingForFinal = false;
      }
      
      if (key === 'e') checkInteraction();
      if (key === ' ' && gamePhase === 'bee_chase') jump();
      if (dialog) advanceDialog();
    };

    const handleKeyUp = (e) => {
      gameDataRef.current.keys[e.key.toLowerCase()] = false;
    };

    const handleMouseMove = (e) => {
      const rect = canvas.getBoundingClientRect();
      gameDataRef.current.crosshair = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      };
    };

    const handleClick = (e) => {
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      if (gamePhase === 'flower_field') clickFlower(x, y);
      if (gamePhase === 'toy_shop') clickToy(x, y);
    };

    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('click', handleClick);
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    const startWalking = () => {
      gameDataRef.current.canMove = true;
      setGamePhase('walking');
    };

    const checkInteraction = () => {
      const { player, npcs } = gameDataRef.current;
      
      if (gamePhase === 'walking') {
        const dist = Math.hypot(player.worldX - npcs.florist1.worldX, player.worldY - npcs.florist1.worldY);
        if (dist < 80 && !npcs.florist1.talked) {
          npcs.florist1.talked = true;
          gameDataRef.current.canMove = false;
          showDialog('florist1');
        }
      }
      
      if (gamePhase === 'walk_to_melisa') {
        const dist = Math.hypot(player.worldX - npcs.melisa.worldX, player.worldY - npcs.melisa.worldY);
        if (dist < 80) {
          setGamePhase('give_gift');
          gameDataRef.current.canMove = false;
          showDialog('melisa');
        }
      }
      
      if (gamePhase === 'walk_to_florist2') {
        const dist = Math.hypot(player.worldX - npcs.florist2.worldX, player.worldY - npcs.florist2.worldY);
        if (dist < 80 && !npcs.florist2.talked) {
          npcs.florist2.talked = true;
          setGamePhase('florist_talk');
          gameDataRef.current.canMove = false;
          showDialog('florist2');
        }
      }
    };

    const showDialog = (type) => {
      if (type === 'florist1') {
        setDialog({
          speaker: 'Çiçekçi',
          lines: [
            'Hoş geldin genç adam! Çiçek mi arıyorsun?',
            'Ah ne yazık ki bugün çiçeklerim bitti...',
            'Ama az ileride muhteşem bir çiçek tarlası var!',
            'Oradan istediğin kadar çiçek toplayabilirsin.'
          ]
        });
      } else if (type === 'melisa') {
        setDialog({
          speaker: 'Melisa',
          lines: [
            'Oh! Bunlar benim için mi?',
            'Çiçekler çok güzel! Ve bu sevimli Capybara!',
            'Çok teşekkür ederim! ❤️'
          ]
        });
      } else if (type === 'florist2') {
        setDialog({
          speaker: 'Çiçekçi',
          lines: [
            'Hoş geldin!',
            'Ne yazık ki... çiçek kalmadı.',
            'Etrafta da bulamazsın maalesef...',
            'Ben de nasıl ya...'
          ]
        });
      }
      setDialogIndex(0);
    };

    const advanceDialog = () => {
      if (!dialog) return;
      if (dialogIndex < dialog.lines.length - 1) {
        setDialogIndex(dialogIndex + 1);
      } else {
        setDialog(null);
        setDialogIndex(0);
        
        if (gamePhase === 'walking') {
          setGamePhase('transition_to_field');
        } else if (gamePhase === 'give_gift') {
          setGamePhase('dream_end');
        } else if (gamePhase === 'florist_talk') {
          setGamePhase('black_screen');
          gameDataRef.current.waitingForFinal = true;
        }
      }
    };

    const clickFlower = (x, y) => {
      gameDataRef.current.flowers.forEach(flower => {
        if (flower.collected) return;
        const dist = Math.hypot(flower.x - x, flower.y - y);
        if (dist < 40) {
          flower.collected = true;
          setFlowersCollected(prev => {
            const newCount = prev + 1;
            if (newCount >= 15) {
              setTimeout(() => {
                setGamePhase('transition_to_bees');
              }, 1000);
            }
            return newCount;
          });

          for (let i = 0; i < 8; i++) {
            gameDataRef.current.particles.push({
              x: flower.x, y: flower.y,
              vx: (Math.random() - 0.5) * 8,
              vy: (Math.random() - 0.5) * 8,
              color: flower.color,
              life: 30,
              size: 3 + Math.random() * 4
            });
          }
        }
      });
    };

    const clickToy = (x, y) => {
      gameDataRef.current.toys.forEach(toy => {
        const dist = Math.hypot(toy.x - x, toy.y - y);
        if (dist < toy.size / 2) {
          gameDataRef.current.attempts++;
          
          for (let i = 0; i < 15; i++) {
            gameDataRef.current.toyParticles.push({
              x: toy.x, y: toy.y,
              vx: (Math.random() - 0.5) * 10,
              vy: (Math.random() - 0.5) * 10,
              color: toy.isTarget ? '#FFD700' : '#E74C3C',
              life: 40,
              size: 4 + Math.random() * 6
            });
          }

          if (toy.isTarget) {
            setTimeout(() => {
              setGamePhase('transition_to_melisa');
            }, 2000);
          }
        }
      });
    };

    const jump = () => {
      const { beePlayer } = gameDataRef.current;
      if (beePlayer.onGround) {
        beePlayer.vy = -11;
        beePlayer.onGround = false;
      }
    };

    const worldToScreen = (worldX, worldY, camera) => {
      const relX = worldX - camera.worldX;
      const relY = worldY - camera.worldY;
      return {
        x: 400 + (relX - relY) * 0.8,
        y: 300 + (relX + relY) * 0.4
      };
    };

    const darken = (color, amount) => {
      const hex = color.replace('#', '');
      const num = parseInt(hex, 16);
      const r = Math.max(0, (num >> 16) - amount);
      const g = Math.max(0, ((num >> 8) & 0x00FF) - amount);
      const b = Math.max(0, (num & 0x0000FF) - amount);
      return '#' + ((r << 16) | (g << 8) | b).toString(16).padStart(6, '0');
    };

    const drawCharacter = (ctx, worldX, worldY, camera, color, walkFrame, hasHat = false, isFemale = false) => {
      const pos = worldToScreen(worldX, worldY, camera);
      
      ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
      ctx.beginPath();
      ctx.ellipse(pos.x, pos.y + 2, 18, 9, 0, 0, Math.PI * 2);
      ctx.fill();

      const bobOffset = Math.sin(walkFrame * 0.3) * 2;
      const legSwing = Math.sin(walkFrame * 0.3) * 8;
      const armSwing = Math.sin(walkFrame * 0.3) * 6;
      const centerX = pos.x;
      const centerY = pos.y - 30 + bobOffset;

      ctx.fillStyle = isFemale ? '#FFB6C1' : '#2C3E50';
      ctx.fillRect(centerX - 12, centerY + 15, 7, 20 + legSwing);
      ctx.fillRect(centerX + 5, centerY + 15, 7, 20 - legSwing);

      const bodyGrad = ctx.createLinearGradient(centerX - 18, centerY - 5, centerX + 18, centerY + 20);
      bodyGrad.addColorStop(0, color);
      bodyGrad.addColorStop(1, darken(color, 30));
      ctx.fillStyle = bodyGrad;
      ctx.fillRect(centerX - 18, centerY - 5, 36, 25);

      ctx.fillStyle = color;
      ctx.fillRect(centerX - 24, centerY, 7, 18 + armSwing);
      ctx.fillRect(centerX + 17, centerY, 7, 18 - armSwing);

      ctx.fillStyle = '#FDB99B';
      ctx.beginPath();
      ctx.arc(centerX - 20, centerY + 18 + armSwing, 5, 0, Math.PI * 2);
      ctx.arc(centerX + 20, centerY + 18 - armSwing, 5, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#FDB99B';
      ctx.fillRect(centerX - 6, centerY - 8, 12, 6);
      ctx.beginPath();
      ctx.arc(centerX, centerY - 18, 14, 0, Math.PI * 2);
      ctx.fill();

      if (isFemale) {
        ctx.fillStyle = '#5D4037';
        ctx.beginPath();
        ctx.arc(centerX, centerY - 22, 16, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillRect(centerX - 16, centerY - 22, 32, 20);
        ctx.beginPath();
        ctx.arc(centerX - 16, centerY - 2, 8, 0, Math.PI * 2);
        ctx.arc(centerX + 16, centerY - 2, 8, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillStyle = '#2C3E50';
        ctx.beginPath();
        ctx.arc(centerX, centerY - 22, 15, Math.PI, Math.PI * 2);
        ctx.fill();
      }

      ctx.fillStyle = '#000';
      ctx.beginPath();
      ctx.arc(centerX - 5, centerY - 18, 2, 0, Math.PI * 2);
      ctx.arc(centerX + 5, centerY - 18, 2, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = '#D08770';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(centerX, centerY - 12, 4, 0, Math.PI);
      ctx.stroke();

      if (hasHat) {
        ctx.fillStyle = '#2ECC71';
        ctx.fillRect(centerX - 20, centerY - 28, 40, 8);
        ctx.fillRect(centerX - 15, centerY - 36, 30, 8);
      }
    };

    const drawBedroom = (ctx) => {
      ctx.fillStyle = '#E8D5C4';
      ctx.fillRect(0, 0, 800, 600);

      for (let i = 0; i < 800; i += 80) {
        ctx.fillStyle = i % 160 === 0 ? '#A68560' : '#B69670';
        ctx.fillRect(i, 350, 80, 250);
      }

      ctx.fillStyle = '#87CEEB';
      ctx.fillRect(550, 80, 180, 150);
      ctx.fillStyle = '#C0392B';
      ctx.fillRect(150, 360, 180, 100);
      ctx.fillStyle = '#E74C3C';
      ctx.fillRect(150, 360, 180, 25);
      ctx.fillStyle = '#ECF0F1';
      ctx.beginPath();
      ctx.ellipse(220, 375, 40, 22, -0.2, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#6D4C41';
      ctx.fillRect(350, 370, 70, 80);
      ctx.fillStyle = '#E74C3C';
      ctx.beginPath();
      ctx.arc(385, 400, 18, 0, Math.PI * 2);
      ctx.fill();

      const { wakeupTimer } = gameDataRef.current;

      if (wakeupTimer < 60) {
        ctx.fillStyle = '#3498DB';
        ctx.fillRect(220, 390, 80, 30);
        const shake = Math.sin(wakeupTimer * 0.8) * 3;
        ctx.font = '24px Arial';
        ctx.fillText('🔔', 378 + shake, 395 + shake);
      } else if (wakeupTimer < 90) {
        ctx.fillStyle = '#3498DB';
        ctx.fillRect(235, 350, 40, 50);
      }

      if (wakeupTimer > 60 && wakeupTimer < 120) {
        ctx.fillStyle = 'white';
        ctx.strokeStyle = '#2C3E50';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(400, 240, 100, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#E74C3C';
        ctx.font = 'bold 32px Arial';
        ctx.fillText('Hasiktir!', 340, 225);
        ctx.font = 'bold 26px Arial';
        if (gamePhase === 'wake_up2') {
          ctx.fillText('Rüya mıymış!', 315, 265);
        } else {
          ctx.fillText('Yine geç kaldım!', 300, 265);
        }
      }

      if (wakeupTimer > 120) {
        ctx.fillStyle = 'rgba(44, 62, 80, 0.9)';
        ctx.fillRect(0, 500, 800, 100);
        ctx.fillStyle = 'white';
        ctx.font = 'bold 28px Arial';
        ctx.fillText('Herhangi bir tuşa bas...', 220, 560);
      }
    };

    const drawOutside = (ctx, camera) => {
      const skyGrad = ctx.createLinearGradient(0, 0, 0, 350);
      skyGrad.addColorStop(0, '#87CEEB');
      skyGrad.addColorStop(1, '#B0D9F0');
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, 800, 350);

      ctx.fillStyle = '#FFD700';
      ctx.beginPath();
      ctx.arc(650, 100, 35, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#6B9B6E';
      ctx.fillRect(0, 350, 800, 250);

      const shopPos = worldToScreen(420, 200, camera);
      ctx.fillStyle = '#E91E63';
      ctx.fillRect(shopPos.x - 90, shopPos.y - 110, 180, 110);
      ctx.fillStyle = 'white';
      ctx.font = 'bold 20px Arial';
      ctx.fillText('🌸 ÇİÇEKÇİ', shopPos.x - 60, shopPos.y - 87);
    };

    const drawFlowerField = (ctx) => {
      const skyGrad = ctx.createLinearGradient(0, 0, 0, 600);
      skyGrad.addColorStop(0, '#87CEEB');
      skyGrad.addColorStop(1, '#E0F6FF');
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, 800, 600);

      ctx.fillStyle = '#FFD700';
      ctx.beginPath();
      ctx.arc(700, 80, 50, 0, Math.PI * 2);
      ctx.fill();

      const grassGrad = ctx.createLinearGradient(0, 150, 0, 600);
      grassGrad.addColorStop(0, '#90EE90');
      grassGrad.addColorStop(1, '#228B22');
      ctx.fillStyle = grassGrad;
      ctx.fillRect(0, 150, 800, 450);

      gameDataRef.current.flowers.forEach(flower => {
        if (flower.collected) return;
        
        ctx.strokeStyle = '#2F7F2F';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(flower.x, flower.y + 30);
        ctx.lineTo(flower.x, flower.y);
        ctx.stroke();

        ctx.save();
        ctx.translate(flower.x, flower.y);
        ctx.scale(flower.scale, flower.scale);
        ctx.font = '48px Arial';
        ctx.fillText(flower.type, -24, 12);
        ctx.restore();
      });

      gameDataRef.current.particles = gameDataRef.current.particles.filter(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.3;
        p.life--;
        
        if (p.life > 0) {
          ctx.fillStyle = p.color;
          ctx.globalAlpha = p.life / 30;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();
          ctx.globalAlpha = 1;
          return true;
        }
        return false;
      });

      ctx.fillStyle = 'white';
      ctx.fillRect(100, 45, 600, 45);
      ctx.fillStyle = '#E0E0E0';
      ctx.fillRect(100, 50, 600, 40);
      const progress = flowersCollected / 15;
      ctx.fillStyle = '#FF69B4';
      ctx.fillRect(100, 50, 600 * progress, 40);
      ctx.strokeStyle = '#C71585';
      ctx.lineWidth = 4;
      ctx.strokeRect(100, 50, 600, 40);
      ctx.fillStyle = '#2C3E50';
      ctx.font = 'bold 24px Arial';
      ctx.fillText(`${flowersCollected} / 15 Çiçek`, 320, 78);

      if (flowersCollected >= 15) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(0, 0, 800, 600);
        ctx.fillStyle = 'white';
        ctx.font = 'bold 48px Arial';
        ctx.fillText('Tüm çiçekleri topladın!', 150, 280);
        ctx.font = 'bold 32px Arial';
        ctx.fillText('Aman dikkat! Arılar geliyor!', 180, 340);
      }
    };

    const drawBeeChase = (ctx) => {
      const { beePlayer, bees } = gameDataRef.current;

      // Gökyüzü
      const skyGrad = ctx.createLinearGradient(0, 0, 0, 600);
      skyGrad.addColorStop(0, '#87CEEB');
      skyGrad.addColorStop(1, '#E0F6FF');
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, 800, 600);

      // Güneş
      ctx.fillStyle = '#FFD700';
      ctx.beginPath();
      ctx.arc(700, 80, 40, 0, Math.PI * 2);
      ctx.fill();

      // Zemin - çimen
      const grassGrad = ctx.createLinearGradient(0, 400, 0, 600);
      grassGrad.addColorStop(0, '#90EE90');
      grassGrad.addColorStop(1, '#228B22');
      ctx.fillStyle = grassGrad;
      ctx.fillRect(0, 400, 800, 200);

      // Çimen detayları
      ctx.strokeStyle = '#1a5f1a';
      ctx.lineWidth = 2;
      for (let i = 0; i < 50; i++) {
        const x = Math.random() * 800;
        const y = 400 + Math.random() * 200;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x - 2, y - 8);
        ctx.stroke();
      }

      // Arılar
      bees.forEach(bee => {
        const beeY = bee.y + Math.sin(bee.wobble) * 8;
        const wingFlap = Math.sin(bee.frame * 0.5) * 12;

        // Kanatlar
        ctx.fillStyle = 'rgba(200, 200, 255, 0.7)';
        ctx.beginPath();
        ctx.ellipse(bee.x - 10, beeY - 8 - Math.abs(wingFlap), 14, 20, -0.3, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(bee.x + 10, beeY - 8 - Math.abs(wingFlap), 14, 20, 0.3, 0, Math.PI * 2);
        ctx.fill();

        // Gövde
        ctx.fillStyle = '#FFD700';
        ctx.beginPath();
        ctx.ellipse(bee.x, beeY, 14, 18, 0, 0, Math.PI * 2);
        ctx.fill();

        // Şeritler
        ctx.fillStyle = '#000';
        ctx.fillRect(bee.x - 12, beeY - 6, 24, 4);
        ctx.fillRect(bee.x - 12, beeY + 3, 24, 4);

        // Kafa
        ctx.fillStyle = '#000';
        ctx.beginPath();
        ctx.arc(bee.x, beeY - 15, 9, 0, Math.PI * 2);
        ctx.fill();

        // Gözler
        ctx.fillStyle = '#E74C3C';
        ctx.beginPath();
        ctx.arc(bee.x - 4, beeY - 14, 3, 0, Math.PI * 2);
        ctx.arc(bee.x + 4, beeY - 14, 3, 0, Math.PI * 2);
        ctx.fill();

        // İğne
        ctx.strokeStyle = '#8B4513';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(bee.x, beeY + 16);
        ctx.lineTo(bee.x, beeY + 22);
        ctx.stroke();
      });

      // Oyuncu
      const bobOffset = Math.sin(beePlayer.frame * 0.3) * 2;
      const legSwing = Math.sin(beePlayer.frame * 0.3) * 10;
      const armSwing = Math.sin(beePlayer.frame * 0.3) * 8;
      const centerX = beePlayer.x;
      const centerY = beePlayer.y - 30 + bobOffset;

      if (beePlayer.invulnerable > 0 && Math.floor(beePlayer.invulnerable / 5) % 2 === 0) {
        ctx.globalAlpha = 0.4;
      }

      // Gölge
      ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
      ctx.beginPath();
      ctx.ellipse(centerX, beePlayer.y + 2, 18, 9, 0, 0, Math.PI * 2);
      ctx.fill();

      // Bacaklar
      ctx.fillStyle = '#2C3E50';
      ctx.fillRect(centerX - 12, centerY + 15, 7, 20 + legSwing);
      ctx.fillRect(centerX + 5, centerY + 15, 7, 20 - legSwing);

      // Gövde
      ctx.fillStyle = '#3498DB';
      ctx.fillRect(centerX - 18, centerY - 5, 36, 25);

      // Kollar
      ctx.fillStyle = '#3498DB';
      ctx.fillRect(centerX - 24, centerY, 7, 18 + armSwing);
      ctx.fillRect(centerX + 17, centerY, 7, 18 - armSwing);

      // Eller
      ctx.fillStyle = '#FDB99B';
      ctx.beginPath();
      ctx.arc(centerX - 20, centerY + 18 + armSwing, 5, 0, Math.PI * 2);
      ctx.arc(centerX + 20, centerY + 18 - armSwing, 5, 0, Math.PI * 2);
      ctx.fill();

      // Boyun
      ctx.fillStyle = '#FDB99B';
      ctx.fillRect(centerX - 6, centerY - 8, 12, 6);

      // Kafa
      ctx.fillStyle = '#FDB99B';
      ctx.beginPath();
      ctx.arc(centerX, centerY - 18, 14, 0, Math.PI * 2);
      ctx.fill();

      // Saç
      ctx.fillStyle = '#2C3E50';
      ctx.beginPath();
      ctx.arc(centerX, centerY - 22, 15, Math.PI, Math.PI * 2);
      ctx.fill();

      // Gözler
      ctx.fillStyle = '#000';
      ctx.beginPath();
      ctx.arc(centerX - 5, centerY - 18, 2, 0, Math.PI * 2);
      ctx.arc(centerX + 5, centerY - 18, 2, 0, Math.PI * 2);
      ctx.fill();

      // Ağız - korkmuş
      ctx.strokeStyle = '#E74C3C';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(centerX, centerY - 10, 5, 0, Math.PI);
      ctx.stroke();

      ctx.globalAlpha = 1;

      // UI - Canlar
      for (let i = 0; i < 3; i++) {
        const heartX = 20 + i * 50;
        ctx.font = '40px Arial';
        ctx.fillText(i < beePlayer.lives ? '❤️' : '🖤', heartX, 50);
      }

      // Süre
      ctx.fillStyle = 'white';
      ctx.fillRect(650, 20, 130, 50);
      ctx.strokeStyle = '#2C3E50';
      ctx.lineWidth = 4;
      ctx.strokeRect(650, 20, 130, 50);
      ctx.fillStyle = timeLeft < 10 ? '#E74C3C' : '#2C3E50';
      ctx.font = 'bold 32px Arial';
      ctx.fillText(`⏱️ ${timeLeft}s`, 660, 55);

      // Talimat
      ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
      ctx.fillRect(200, 100, 400, 60);
      ctx.fillStyle = '#FFF';
      ctx.font = 'bold 24px Arial';
      ctx.fillText('WASD ile hareket et!', 240, 135);

      // Başarı
      if (timeLeft <= 0 && beePlayer.lives > 0) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        ctx.fillRect(0, 0, 800, 600);
        ctx.fillStyle = '#2ECC71';
        ctx.font = 'bold 56px Arial';
        ctx.fillText('Kurtuldun! 🎉', 250, 300);
      }

      // Oyun bitti
      if (beePlayer.lives <= 0) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        ctx.fillRect(0, 0, 800, 600);
        ctx.fillStyle = '#E74C3C';
        ctx.font = 'bold 56px Arial';
        ctx.fillText('Arılar Yakaladı! 🐝', 180, 280);
        ctx.font = 'bold 28px Arial';
        ctx.fillText('Sayfayı yenile', 280, 340);
      }
    };

    const drawToyShop = (ctx) => {
      ctx.fillStyle = '#FFF5E6';
      ctx.fillRect(0, 0, 800, 600);

      ctx.fillStyle = 'white';
      ctx.fillRect(200, 80, 400, 80);
      ctx.strokeStyle = '#8B4513';
      ctx.lineWidth = 5;
      ctx.strokeRect(200, 80, 400, 80);
      ctx.fillStyle = '#E91E63';
      ctx.font = 'bold 36px Arial';
      ctx.fillText('🎯 OYUNCAK NIŞAN', 220, 135);

      gameDataRef.current.toys.forEach(toy => {
        toy.x += toy.vx;
        if (toy.x <= toy.minX || toy.x >= toy.maxX) toy.vx *= -1;

        if (toy.isTarget) {
          const pulse = Math.sin(Date.now() * 0.005) * 0.3 + 0.7;
          ctx.strokeStyle = `rgba(255, 215, 0, ${pulse})`;
          ctx.lineWidth = 4;
          ctx.beginPath();
          ctx.arc(toy.x, toy.y, toy.size / 2 + 10, 0, Math.PI * 2);
          ctx.stroke();
        }

        ctx.font = `${toy.size}px Arial`;
        ctx.fillText(toy.emoji, toy.x - toy.size / 2, toy.y + toy.size / 3);

        ctx.fillStyle = 'white';
        ctx.fillRect(toy.x - 40, toy.y + toy.size / 2 + 15, 80, 25);
        ctx.strokeStyle = toy.isTarget ? '#FFD700' : '#2C3E50';
        ctx.lineWidth = 2;
        ctx.strokeRect(toy.x - 40, toy.y + toy.size / 2 + 15, 80, 25);
        ctx.fillStyle = toy.isTarget ? '#E91E63' : '#2C3E50';
        ctx.font = 'bold 14px Arial';
        ctx.fillText(toy.name, toy.x - 30, toy.y + toy.size / 2 + 33);
      });

      gameDataRef.current.toyParticles = gameDataRef.current.toyParticles.filter(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.4;
        p.life--;
        
        if (p.life > 0) {
          ctx.fillStyle = p.color;
          ctx.globalAlpha = p.life / 40;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();
          ctx.globalAlpha = 1;
          return true;
        }
        return false;
      });

      const { x, y } = gameDataRef.current.crosshair;
      ctx.strokeStyle = '#E74C3C';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(x, y, 25, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x - 35, y);
      ctx.lineTo(x - 15, y);
      ctx.moveTo(x + 15, y);
      ctx.lineTo(x + 35, y);
      ctx.moveTo(x, y - 35);
      ctx.lineTo(x, y - 15);
      ctx.moveTo(x, y + 15);
      ctx.lineTo(x, y + 35);
      ctx.stroke();
    };

    const drawPark = (ctx, camera) => {
      const skyGrad = ctx.createLinearGradient(0, 0, 0, 350);
      skyGrad.addColorStop(0, '#87CEEB');
      skyGrad.addColorStop(1, '#B0D9F0');
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, 800, 350);

      ctx.fillStyle = '#FFD700';
      ctx.beginPath();
      ctx.arc(650, 100, 35, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#6B9B6E';
      ctx.fillRect(0, 350, 800, 250);

      const trees = [
        { x: 200, y: 150 }, { x: 600, y: 150 },
        { x: 250, y: 300 }, { x: 550, y: 300 }
      ];
      
      trees.forEach(tree => {
        const tPos = worldToScreen(tree.x, tree.y, camera);
        ctx.fillStyle = '#8B5A3C';
        ctx.fillRect(tPos.x - 8, tPos.y - 40, 16, 40);
        ctx.fillStyle = '#2D5016';
        ctx.beginPath();
        ctx.arc(tPos.x, tPos.y - 50, 35, 0, Math.PI * 2);
        ctx.fill();
      });
    };

    const drawFinal = (ctx) => {
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, 800, 600);

      const fadeIn = Math.min(1, gameDataRef.current.fadeAlpha);
      ctx.globalAlpha = fadeIn;

      for (let i = 0; i < 20; i++) {
        const x = 100 + (i % 5) * 150 + Math.sin(gameDataRef.current.timer * 0.02 + i) * 20;
        const y = 100 + Math.floor(i / 5) * 120 + Math.cos(gameDataRef.current.timer * 0.03 + i) * 15;
        ctx.font = '32px Arial';
        ctx.fillText('❤️', x, y);
      }

      ctx.fillStyle = '#FF1493';
      ctx.font = 'bold 56px Arial';
      ctx.fillText('DOĞUM GÜNÜN', 180, 250);
      ctx.fillText('KUTLU OLSUN', 200, 310);
      
      ctx.fillStyle = '#FFB6C1';
      ctx.font = 'bold 48px Arial';
      ctx.fillText('BALIM', 310, 380);

      ctx.fillStyle = '#FFF';
      ctx.font = 'bold 40px Arial';
      ctx.fillText('Seni Seviyorum 💕', 220, 450);

      ctx.font = 'italic 20px Arial';
      ctx.fillStyle = '#AAA';
      ctx.fillText('(Çiçek ve oyuncağı zaten almıştım 😊)', 200, 520);

      ctx.globalAlpha = 1;
    };

    const drawTransition = (ctx, text) => {
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, 800, 600);
      
      const alpha = gameDataRef.current.fadeAlpha;
      ctx.globalAlpha = alpha;
      ctx.fillStyle = '#FFF';
      ctx.font = 'bold 36px Arial';
      const w = ctx.measureText(text).width;
      ctx.fillText(text, 400 - w/2, 300);
      ctx.globalAlpha = 1;
    };

    const drawBlackScreen = (ctx) => {
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, 800, 600);
      
      ctx.fillStyle = 'white';
      ctx.font = 'bold 28px Arial';
      ctx.fillText('Herhangi bir tuşa bas...', 220, 560);
    };

    const update = () => {
      const data = gameDataRef.current;
      data.timer++;
      
      if (gamePhase === 'wakeup' || gamePhase === 'wake_up2') {
        data.wakeupTimer++;
      }

      if ((gamePhase === 'walking' || gamePhase === 'walk_to_melisa' || gamePhase === 'walk_to_florist2') && data.canMove) {
        const { keys, player } = data;
        let vx = 0, vy = 0;

        if (keys['w'] || keys['arrowup']) vy = -player.speed;
        if (keys['s'] || keys['arrowdown']) vy = player.speed;
        if (keys['a'] || keys['arrowleft']) vx = -player.speed;
        if (keys['d'] || keys['arrowright']) vx = player.speed;

        if (vx !== 0 && vy !== 0) {
          vx *= 0.707;
          vy *= 0.707;
        }

        player.worldX += vx;
        player.worldY += vy;
        player.worldX = Math.max(150, Math.min(650, player.worldX));
        player.worldY = Math.max(150, Math.min(750, player.worldY));

        if (vx !== 0 || vy !== 0) {
          player.animTimer++;
          if (player.animTimer > 6) {
            player.walkFrame++;
            player.animTimer = 0;
          }
        } else {
          player.walkFrame = 0;
        }

        data.camera.worldX += (player.worldX - data.camera.worldX) * 0.1;
        data.camera.worldY += (player.worldY - data.camera.worldY) * 0.1;
      }

      if (gamePhase === 'transition_to_field' || gamePhase === 'transition_to_bees' || gamePhase === 'transition_to_toys' || gamePhase === 'transition_to_melisa') {
        data.fadeAlpha += 0.02;
        if (data.fadeAlpha >= 1) {
          data.fadeAlpha = 0;
          if (gamePhase === 'transition_to_field') setGamePhase('flower_field');
          if (gamePhase === 'transition_to_bees') {
            setGamePhase('bee_chase');
            setTimeLeft(60);
          }
          if (gamePhase === 'transition_to_toys') setGamePhase('toy_shop');
          if (gamePhase === 'transition_to_melisa') {
            data.player.worldX = 400;
            data.player.worldY = 400;
            data.canMove = true;
            setGamePhase('walk_to_melisa');
          }
        }
      }

      if (gamePhase === 'dream_end') {
        data.fadeAlpha += 0.01;
        if (data.fadeAlpha >= 1) {
          data.fadeAlpha = 0;
          data.wakeupTimer = 0;
          setGamePhase('wake_up2');
        }
      }

      if (gamePhase === 'final') {
        data.fadeAlpha = Math.min(1, data.fadeAlpha + 0.015);
      }

      if (gamePhase === 'bee_chase') {
        const { beePlayer, bees } = data;

        if (beePlayer.lives > 0 && data.timer < 3600) {
          // Hareket kontrolleri - oyuncu tüm yönlere hareket edebilir
          const { keys } = data;
          let vx = 0, vy = 0;

          if (keys['w'] || keys['arrowup']) vy = -4;
          if (keys['s'] || keys['arrowdown']) vy = 4;
          if (keys['a'] || keys['arrowleft']) vx = -4;
          if (keys['d'] || keys['arrowright']) vx = 4;

          if (vx !== 0 && vy !== 0) {
            vx *= 0.707;
            vy *= 0.707;
          }

          beePlayer.x += vx;
          beePlayer.y += vy;

          // Sınırlar
          beePlayer.x = Math.max(50, Math.min(750, beePlayer.x));
          beePlayer.y = Math.max(50, Math.min(550, beePlayer.y));

          // Arılar - sağdan sola ve hafif yukarı aşağı
          bees.forEach(bee => {
            bee.x -= bee.speed;
            bee.wobble += 0.05;
            bee.y += Math.sin(bee.wobble) * 1.5;
            bee.frame++;

            // Ekranın solundan çıkan arıları sağa geri döndür
            if (bee.x < -50) {
              bee.x = 900 + Math.random() * 100;
              bee.y = 100 + Math.random() * 300;
            }

            // Oyuncuya çarptı mı?
            const dist = Math.hypot(beePlayer.x - bee.x, beePlayer.y - bee.y);
            if (dist < 35 && beePlayer.invulnerable <= 0) {
              beePlayer.lives--;
              beePlayer.invulnerable = 90;
            }
          });

          if (beePlayer.invulnerable > 0) {
            beePlayer.invulnerable--;
          }

          if (vx !== 0 || vy !== 0) {
            beePlayer.frame++;
          }
        }

        data.beeTimer++;
        if (data.beeTimer >= 60) {
          data.beeTimer = 0;
          setTimeLeft(prev => {
            if (prev <= 1) {
              // Süre bitti, geçti!
              setTimeout(() => setGamePhase('transition_to_toys'), 1500);
              return 0;
            }
            return prev - 1;
          });
        }
      }
    };

    const draw = () => {
      ctx.clearRect(0, 0, 800, 600);
      const data = gameDataRef.current;

      if (gamePhase === 'wakeup' || gamePhase === 'wake_up2') {
        drawBedroom(ctx);
      } else if (gamePhase === 'walking') {
        drawOutside(ctx, data.camera);
        const renderQueue = [];
        renderQueue.push({ y: data.npcs.florist1.worldY, fn: () => drawCharacter(ctx, data.npcs.florist1.worldX, data.npcs.florist1.worldY, data.camera, '#27AE60', 0, true) });
        renderQueue.push({ y: data.player.worldY, fn: () => drawCharacter(ctx, data.player.worldX, data.player.worldY, data.camera, '#3498DB', data.player.walkFrame) });
        renderQueue.sort((a, b) => a.y - b.y);
        renderQueue.forEach(item => item.fn());

        const dist = Math.hypot(data.player.worldX - data.npcs.florist1.worldX, data.player.worldY - data.npcs.florist1.worldY);
        if (dist < 80 && !data.npcs.florist1.talked) {
          const pos = worldToScreen(data.npcs.florist1.worldX, data.npcs.florist1.worldY, data.camera);
          ctx.fillStyle = 'white';
          ctx.fillRect(pos.x - 50, pos.y - 85, 100, 40);
          ctx.strokeStyle = '#27AE60';
          ctx.lineWidth = 4;
          ctx.strokeRect(pos.x - 50, pos.y - 85, 100, 40);
          ctx.fillStyle = '#27AE60';
          ctx.font = 'bold 20px Arial';
          ctx.fillText('[E] Konuş', pos.x - 40, pos.y - 57);
        }
      } else if (gamePhase === 'transition_to_field') {
        drawTransition(ctx, 'Çiçek tarlasına gidiyorsun...');
      } else if (gamePhase === 'flower_field') {
        drawFlowerField(ctx);
      } else if (gamePhase === 'transition_to_bees') {
        drawTransition(ctx, 'Arılar geliyor!');
      } else if (gamePhase === 'bee_chase') {
        drawBeeChase(ctx);
      } else if (gamePhase === 'transition_to_toys') {
        drawTransition(ctx, 'Oyuncakçıya gidiyorsun...');
      } else if (gamePhase === 'toy_shop') {
        drawToyShop(ctx);
      } else if (gamePhase === 'transition_to_melisa') {
        drawTransition(ctx, 'Melisa\'ya gidiyorsun...');
      } else if (gamePhase === 'walk_to_melisa' || gamePhase === 'give_gift') {
        drawPark(ctx, data.camera);
        const renderQueue = [];
        renderQueue.push({ y: data.npcs.melisa.worldY, fn: () => drawCharacter(ctx, data.npcs.melisa.worldX, data.npcs.melisa.worldY, data.camera, '#FF69B4', 0, false, true) });
        renderQueue.push({ y: data.player.worldY, fn: () => drawCharacter(ctx, data.player.worldX, data.player.worldY, data.camera, '#3498DB', data.player.walkFrame) });
        renderQueue.sort((a, b) => a.y - b.y);
        renderQueue.forEach(item => item.fn());

        if (gamePhase === 'give_gift') {
          const melisaPos = worldToScreen(data.npcs.melisa.worldX, data.npcs.melisa.worldY, data.camera);
          const bounce = Math.sin(data.timer * 0.1) * 5;
          ctx.font = '48px Arial';
          ctx.fillText('🌸', melisaPos.x - 60, melisaPos.y - 60 + bounce);
          ctx.fillText('🦫', melisaPos.x + 20, melisaPos.y - 60 + bounce);
        } else {
          const dist = Math.hypot(data.player.worldX - data.npcs.melisa.worldX, data.player.worldY - data.npcs.melisa.worldY);
          if (dist < 80) {
            const pos = worldToScreen(data.npcs.melisa.worldX, data.npcs.melisa.worldY, data.camera);
            ctx.fillStyle = 'white';
            ctx.fillRect(pos.x - 65, pos.y - 85, 130, 40);
            ctx.strokeStyle = '#FF1493';
            ctx.lineWidth = 4;
            ctx.strokeRect(pos.x - 65, pos.y - 85, 130, 40);
            ctx.fillStyle = '#FF1493';
            ctx.font = 'bold 20px Arial';
            ctx.fillText('[E] Hediye Ver', pos.x - 55, pos.y - 57);
          }
        }
      } else if (gamePhase === 'walk_to_florist2') {
        drawPark(ctx, data.camera);
        const shopPos = worldToScreen(data.npcs.florist2.worldX, data.npcs.florist2.worldY - 50, data.camera);
        ctx.fillStyle = '#E91E63';
        ctx.fillRect(shopPos.x - 90, shopPos.y - 55, 180, 110);
        ctx.fillStyle = 'white';
        ctx.font = 'bold 20px Arial';
        ctx.fillText('🌸 ÇİÇEKÇİ', shopPos.x - 60, shopPos.y - 32);

        const renderQueue = [];
        renderQueue.push({ y: data.npcs.florist2.worldY, fn: () => drawCharacter(ctx, data.npcs.florist2.worldX, data.npcs.florist2.worldY, data.camera, '#27AE60', 0, true) });
        renderQueue.push({ y: data.player.worldY, fn: () => drawCharacter(ctx, data.player.worldX, data.player.worldY, data.camera, '#3498DB', data.player.walkFrame) });
        renderQueue.sort((a, b) => a.y - b.y);
        renderQueue.forEach(item => item.fn());

        const dist = Math.hypot(data.player.worldX - data.npcs.florist2.worldX, data.player.worldY - data.npcs.florist2.worldY);
        if (dist < 80 && !data.npcs.florist2.talked) {
          const floristPos = worldToScreen(data.npcs.florist2.worldX, data.npcs.florist2.worldY, data.camera);
          ctx.fillStyle = 'white';
          ctx.fillRect(floristPos.x - 50, floristPos.y - 85, 100, 40);
          ctx.strokeStyle = '#27AE60';
          ctx.lineWidth = 4;
          ctx.strokeRect(floristPos.x - 50, floristPos.y - 85, 100, 40);
          ctx.fillStyle = '#27AE60';
          ctx.font = 'bold 20px Arial';
          ctx.fillText('[E] Konuş', floristPos.x - 40, floristPos.y - 57);
        }
      } else if (gamePhase === 'black_screen') {
        drawBlackScreen(ctx);
      } else if (gamePhase === 'final') {
        drawFinal(ctx);
      }

      if (dialog) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
        ctx.fillRect(0, 450, 800, 150);
        
        ctx.fillStyle = 'white';
        ctx.fillRect(40, 460, 720, 130);
        
        ctx.fillStyle = '#2C3E50';
        ctx.font = 'bold 24px Arial';
        ctx.fillText(dialog.speaker, 60, 495);
        
        ctx.font = '20px Arial';
        const line = dialog.lines[dialogIndex];
        ctx.fillText(line, 60, 530);

        ctx.font = 'italic 16px Arial';
        ctx.fillStyle = '#7F8C8D';
        ctx.fillText('Devam etmek için herhangi bir tuşa bas...', 60, 575);
      }
    };

    const gameLoop = () => {
      update();
      draw();
      animationId = requestAnimationFrame(gameLoop);
    };

    gameLoop();

    return () => {
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('click', handleClick);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      cancelAnimationFrame(animationId);
    };
  }, [gamePhase, dialog, dialogIndex, flowersCollected, timeLeft]);

  const getPhaseTitle = () => {
    if (gamePhase === 'wakeup') return 'Bölüm 1: Rüya Başlangıcı';
    if (gamePhase === 'flower_field') return 'Bölüm 2: Çiçek Tarlası';
    if (gamePhase === 'bee_chase') return 'Bölüm 3: Arılardan Kaç!';
    if (gamePhase === 'toy_shop') return 'Bölüm 4: Oyuncakçı';
    if (gamePhase === 'walk_to_melisa' || gamePhase === 'give_gift') return 'Bölüm 5: Hediye Verme';
    if (gamePhase === 'final') return '💕 HAPPY BIRTHDAY! 💕';
    return 'Melisa\'nın Doğum Günü';
  };

  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center', 
      justifyContent: 'center', 
      minHeight: '100vh', 
      backgroundColor: '#1a1a2e',
      padding: '20px'
    }}>
      <h1 style={{ 
        color: '#fff', 
        marginBottom: '10px', 
        fontFamily: 'Arial, sans-serif',
        fontSize: '36px',
        textShadow: '2px 2px 4px rgba(0,0,0,0.5)'
      }}>
        🌸 Melisa'nın Doğum Günü 🌸
      </h1>
      <p style={{
        color: '#e91e63',
        marginBottom: '20px',
        fontFamily: 'Arial, sans-serif',
        fontSize: '18px'
      }}>
        {getPhaseTitle()}
      </p>
      <canvas 
        ref={canvasRef} 
        width={800} 
        height={600}
        style={{ 
          border: '5px solid #34495e',
          borderRadius: '12px',
          boxShadow: '0 15px 40px rgba(0,0,0,0.6)',
          backgroundColor: '#000',
          cursor: gamePhase === 'toy_shop' ? 'none' : 'default'
        }}
      />
      <div style={{ 
        marginTop: '25px', 
        color: '#ecf0f1', 
        textAlign: 'center',
        fontFamily: 'Arial, sans-serif',
        maxWidth: '700px',
        backgroundColor: 'rgba(44, 62, 80, 0.8)',
        padding: '15px 25px',
        borderRadius: '10px'
      }}>
        {gamePhase === 'final' ? (
          <p style={{ margin: '5px 0', fontSize: '18px' }}>
            <strong>🎉 Oyun Tamamlandı! ❤️</strong>
          </p>
        ) : (
          <>
            <p style={{ margin: '5px 0', fontSize: '18px' }}>
              <strong>🎮 Kontroller:</strong>
            </p>
            <p style={{ margin: '5px 0', fontSize: '16px' }}>
              {gamePhase === 'flower_field' && <strong>Çiçeklere tıkla!</strong>}
              {gamePhase === 'bee_chase' && <strong>Space - Zıplama | Arılardan kaç!</strong>}
              {gamePhase === 'toy_shop' && <strong>Capybara'yı bul ve tıkla! 🦫</strong>}
              {(gamePhase === 'walking' || gamePhase === 'walk_to_melisa' || gamePhase === 'walk_to_florist2') && <strong>WASD / Ok Tuşları - Hareket | E - Etkileşim</strong>}
              {gamePhase === 'black_screen' && <strong>Herhangi bir tuşa bas...</strong>}
            </p>
          </>
        )}
      </div>
    </div>
  );
};

export default BirthdayGame;
