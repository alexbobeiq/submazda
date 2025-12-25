// --- CONFIGURARE JOC ---
const TARGET_SCORE = 18000;
const GAME_SPEED = 0.40; 

const MESSAGES = [
    "Te iubesc!", "Ești superbă!", "Hai la shopping!", 
    "Ești raza mea", "Zâmbește!", "Pantofi noi?",
    "Încă puțin!", "Perfectă!", "Inima mea e a ta",
    "Cenușăreasa mea!", "Vroom Vroom!", "Sari peste pantof!"
];

// DETECTARE MOBIL (Ecran mai ingust de 768px)
const isMobile = window.innerWidth < 768;

// Globals
let scene, camera, renderer;
let player, snowSystem, roadGroup; 
let obstacles = [];
let gameActive = false;
let score = 0;
let frameId;
let gltfLoader; 

// Modele incarcate
let loadedShoeModel = null; 
let loadedCarModel = null; 

// --- CONFIGURARE BENZI LATE ---
let currentLane = 1; 
const LANE_POSITIONS = [-5, 0, 5]; 
const ROAD_LENGTH = 1200;

// --- FIZICA ---
let isJumping = false;
let jumpVelocity = 0;
const GRAVITY = 0.03; 
const JUMP_FORCE = 0.65; 
const GROUND_Y = 1;

// Spawn logic
let spawnDistanceTimer = 0; 
const MIN_DISTANCE_BETWEEN_OBS = 22; 

// --- TOUCH VARIABLES ---
let touchStartX = 0;
let touchStartY = 0;

// DOM Elements
const scoreEl = document.getElementById('score');
const msgContainer = document.getElementById('messages-container');

// Buttons
const startBtn = document.getElementById('start-btn');
const restartLoseBtn = document.getElementById('restart-lose-btn');
const restartWinBtn = document.getElementById('restart-win-btn');

function bindButton(btn, action) {
    btn.addEventListener('click', action);
    btn.addEventListener('touchstart', (e) => {
        e.preventDefault(); 
        action();
    }, { passive: false });
}

bindButton(startBtn, startGame);
bindButton(restartLoseBtn, resetGame);
bindButton(restartWinBtn, resetGame);

function init() {
    scene = new THREE.Scene();
    
    // ZIUA
    const dayColor = 0xaaccff; 
    scene.background = new THREE.Color(dayColor);
    scene.fog = new THREE.Fog(dayColor, 60, 180); 

    camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
    // Pe mobil departam putin camera ca sa se vada mai bine benzile
    camera.position.set(0, isMobile ? 8 : 7, isMobile ? 16 : 14); 
    camera.lookAt(0, 1, -5);

    // --- OPTIMIZARE RENDERER ---
    renderer = new THREE.WebGLRenderer({ 
        antialias: !isMobile, // Oprim antialias pe mobil (performanta)
        alpha: true,
        powerPreference: "high-performance" // Cere browserului GPU-ul puternic
    });
    
    // LIMITARE PIXEL RATIO: Pe mobil max 1.5, altfel "fierbe" telefonul
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, isMobile ? 1.5 : 2));
    
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    
    // Pe mobil folosim umbre simple (Basic), pe PC umbre fine (PCFSoft)
    renderer.shadowMap.type = isMobile ? THREE.BasicShadowMap : THREE.PCFSoftShadowMap;
    
    document.body.appendChild(renderer.domElement);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xfffde7, 1.0);
    dirLight.position.set(20, 30, 10);
    dirLight.castShadow = true;
    
    // OPTIMIZARE UMBRE: Harta mica pe mobil
    const shadowSize = isMobile ? 512 : 2048; 
    dirLight.shadow.mapSize.width = shadowSize;
    dirLight.shadow.mapSize.height = shadowSize;
    
    scene.add(dirLight);

    gltfLoader = new THREE.GLTFLoader();
    
    loadShoeModel();
    loadCarModel();

    createEnvironment();
    createPlayer();
    createSnow();

    window.addEventListener('resize', onWindowResize, false);
    
    // Inputs
    document.addEventListener('keydown', handleInput);
    document.addEventListener('touchstart', handleTouchStart, { passive: false });
    document.addEventListener('touchmove', handleTouchMove, { passive: false }); 
    document.addEventListener('touchend', handleTouchEnd, { passive: false });
    
    renderer.render(scene, camera);
}

function loadShoeModel() {
    gltfLoader.load('./shoe.glb', function (gltf) {
        loadedShoeModel = gltf.scene;
        loadedShoeModel.scale.set(0.2, 0.2, 0.2); 
        loadedShoeModel.rotation.y = 0; 
        
        loadedShoeModel.traverse(function (node) {
            if (node.isMesh) node.castShadow = true;
        });
    });
}

function loadCarModel() {
    gltfLoader.load('./mazda.glb', function (gltf) {
        loadedCarModel = gltf.scene;
        loadedCarModel.scale.set(10.0, 15.0, 10.0); 
        loadedCarModel.rotation.y = 0; 

        loadedCarModel.traverse(function (node) {
            if (node.isMesh) node.castShadow = true;
        });
    }, undefined, function(e) { console.error("Lipseste mazda.glb", e); });
}

function createEnvironment() {
    roadGroup = new THREE.Group();

    const roadGeo = new THREE.BoxGeometry(20, 0.2, ROAD_LENGTH);
    const roadMat = new THREE.MeshPhongMaterial({ color: 0x5e4b5e });
    const road = new THREE.Mesh(roadGeo, roadMat);
    road.position.set(0, -0.1, -ROAD_LENGTH / 2 + 20);
    road.receiveShadow = true;
    roadGroup.add(road);

    const lineGeo = new THREE.PlaneGeometry(0.2, ROAD_LENGTH);
    const lineMat = new THREE.MeshBasicMaterial({ color: 0xffffff, opacity: 0.6, transparent: true });
    
    const lineLeft = new THREE.Mesh(lineGeo, lineMat);
    lineLeft.rotation.x = -Math.PI / 2;
    lineLeft.position.set(-2.5, 0.01, -ROAD_LENGTH / 2 + 20);
    roadGroup.add(lineLeft);

    const lineRight = new THREE.Mesh(lineGeo, lineMat);
    lineRight.rotation.x = -Math.PI / 2;
    lineRight.position.set(2.5, 0.01, -ROAD_LENGTH / 2 + 20);
    roadGroup.add(lineRight);

    const snowBankGeo = new THREE.BoxGeometry(10, 1.5, ROAD_LENGTH);
    const snowBankMat = new THREE.MeshPhongMaterial({ color: 0xffffff });
    
    const leftBank = new THREE.Mesh(snowBankGeo, snowBankMat);
    leftBank.position.set(-15, 0.5, -ROAD_LENGTH / 2 + 20); 
    roadGroup.add(leftBank);

    const rightBank = new THREE.Mesh(snowBankGeo, snowBankMat);
    rightBank.position.set(15, 0.5, -ROAD_LENGTH / 2 + 20); 
    roadGroup.add(rightBank);

    scene.add(roadGroup);
}

function createPlayer() {
    player = new THREE.Group();

    const x = 0, y = 0;
    const heartShape = new THREE.Shape();
    heartShape.moveTo( x + 0.5, y + 0.5 );
    heartShape.bezierCurveTo( x + 0.5, y + 0.5, x + 0.4, y, x, y );
    heartShape.bezierCurveTo( x - 0.6, y, x - 0.6, y + 0.7,x - 0.6, y + 0.7 );
    heartShape.bezierCurveTo( x - 0.6, y + 1.1, x - 0.3, y + 1.54, x + 0.5, y + 1.9 );
    heartShape.bezierCurveTo( x + 1.2, y + 1.54, x + 1.6, y + 1.1, x + 1.6, y + 0.7 );
    heartShape.bezierCurveTo( x + 1.6, y + 0.7, x + 1.6, y, x + 1.0, y );
    heartShape.bezierCurveTo( x + 0.7, y, x + 0.5, y + 0.5, x + 0.5, y + 0.5 );

    const extrudeSettings = { depth: 0.4, bevelEnabled: true, bevelSegments: 3, steps: 2, bevelSize: 0.1, bevelThickness: 0.1 };
    const geometry = new THREE.ExtrudeGeometry( heartShape, extrudeSettings );
    geometry.center();
    geometry.rotateZ(Math.PI); 
    geometry.rotateX(Math.PI);

    const material = new THREE.MeshPhongMaterial({ color: 0xff3333, shininess: 150 });
    const heartMesh = new THREE.Mesh( geometry, material );
    heartMesh.castShadow = true;
    heartMesh.name = "heartModel"; 
    player.add(heartMesh);

    const shadowGeo = new THREE.CircleGeometry(0.4, 16);
    const shadowMat = new THREE.MeshBasicMaterial({ color: 0x000000, opacity: 0.3, transparent: true });
    const shadow = new THREE.Mesh(shadowGeo, shadowMat);
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = -0.9;
    shadow.name = "shadow";
    player.add(shadow);

    player.position.y = GROUND_Y;
    player.position.z = 0;
    scene.add( player );
}

function createSnow() {
    const snowGeo = new THREE.BufferGeometry();
    // OPTIMIZARE: Mult mai putini fulgi pe mobil (600 vs 2000)
    const snowCount = isMobile ? 600 : 2000;
    
    const posArray = new Float32Array(snowCount * 3);
    for(let i = 0; i < snowCount * 3; i+=3) {
        posArray[i] = (Math.random() - 0.5) * 80; 
        posArray[i+1] = Math.random() * 30; 
        posArray[i+2] = (Math.random() - 0.5) * 100 - 20;
    }
    snowGeo.setAttribute('position', new THREE.BufferAttribute(posArray, 3));
    const snowMat = new THREE.PointsMaterial({ color: 0xffffff, size: 0.25, transparent: true, opacity: 0.8 });
    snowSystem = new THREE.Points(snowGeo, snowMat);
    scene.add(snowSystem);
}

function spawnObstaclePattern(zPos) {
    const lanes = [0, 1, 2];
    lanes.sort(() => Math.random() - 0.5); 

    let obstacleCount;
    const r = Math.random();
    if (r < 0.25) obstacleCount = 1;      
    else if (r < 0.70) obstacleCount = 2; 
    else obstacleCount = 3;               

    if (obstacleCount === 3) {
        const guaranteedShoeIndex = Math.floor(Math.random() * 3);
        for (let i = 0; i < 3; i++) {
            const lane = lanes[i];
            if (i === guaranteedShoeIndex) {
                spawnSingleShoe(lane, zPos);
            } else {
                if (Math.random() < 0.5) spawnSingleCar(lane, zPos);
                else spawnSingleShoe(lane, zPos);
            }
        }
    } else {
        for (let i = 0; i < obstacleCount; i++) {
            const lane = lanes[i];
            if (Math.random() < 0.4) spawnSingleCar(lane, zPos);
            else spawnSingleShoe(lane, zPos);
        }
    }
}

function spawnSingleShoe(laneIndex, zPos) {
    if (!loadedShoeModel) return;
    const clone = loadedShoeModel.clone();
    clone.userData = { height: 1.5, type: 'shoe' };
    clone.position.set(LANE_POSITIONS[laneIndex], 0, zPos);
    scene.add(clone);
    obstacles.push({ mesh: clone, lane: laneIndex });
}

function spawnSingleCar(laneIndex, zPos) {
    if (!loadedCarModel) return;
    const clone = loadedCarModel.clone();
    clone.userData = { height: 10.0, type: 'car' }; 
    clone.position.set(LANE_POSITIONS[laneIndex], 0, zPos);
    scene.add(clone);
    obstacles.push({ mesh: clone, lane: laneIndex });
}

// --- INPUTS ---

function handleInput(e) {
    if (!gameActive) return;
    if(["Space","ArrowUp","ArrowDown","ArrowLeft","ArrowRight"].indexOf(e.code) > -1) {
        e.preventDefault();
    }
    if (e.key === 'ArrowLeft' && currentLane > 0) currentLane--;
    else if (e.key === 'ArrowRight' && currentLane < 2) currentLane++;

    if ((e.key === 'ArrowUp' || e.key === ' ') && !isJumping) {
        isJumping = true;
        jumpVelocity = JUMP_FORCE;
    }
}

function handleTouchStart(e) {
    if(e.target.tagName !== 'BUTTON') { 
        e.preventDefault(); 
    }
    const firstTouch = e.changedTouches[0];
    touchStartX = firstTouch.clientX;
    touchStartY = firstTouch.clientY;
}

function handleTouchMove(e) {
    e.preventDefault();
}

function handleTouchEnd(e) {
    if(!gameActive) return;
    if(e.target.tagName !== 'BUTTON') e.preventDefault();
    
    const endX = e.changedTouches[0].clientX;
    const endY = e.changedTouches[0].clientY;
    handleSwipe(touchStartX, touchStartY, endX, endY);
}

function handleSwipe(sx, sy, ex, ey) {
    const diffX = ex - sx;
    const diffY = ey - sy;
    const threshold = 30; 

    if (Math.abs(diffX) > Math.abs(diffY)) {
        if (Math.abs(diffX) > threshold) {
            if (diffX > 0 && currentLane < 2) currentLane++; 
            else if (diffX < 0 && currentLane > 0) currentLane--; 
        }
    } else {
        if (Math.abs(diffY) > threshold) {
            if (diffY < 0 && !isJumping) {
                isJumping = true;
                jumpVelocity = JUMP_FORCE;
            }
        }
    }
}

function showFloatingMessage() {
    const msg = document.createElement('div');
    msg.className = 'love-msg';
    msg.innerText = MESSAGES[Math.floor(Math.random() * MESSAGES.length)];
    msgContainer.appendChild(msg);
    setTimeout(() => { msg.remove(); }, 4500);
}

function animate() {
    if (!gameActive) return;
    frameId = requestAnimationFrame(animate);

    if (isJumping) {
        player.position.y += jumpVelocity;
        jumpVelocity -= GRAVITY;
        if (player.position.y <= GROUND_Y) {
            player.position.y = GROUND_Y;
            isJumping = false;
            jumpVelocity = 0;
        }
    }
    
    const shadowMesh = player.getObjectByName("shadow");
    if(shadowMesh) {
        shadowMesh.position.y = -player.position.y + 0.1; 
        const scale = 1 - ((player.position.y - GROUND_Y) * 0.25);
        shadowMesh.scale.set(scale, scale, 1);
        shadowMesh.material.opacity = 0.3 * scale;
    }

    const targetX = LANE_POSITIONS[currentLane];
    player.position.x += (targetX - player.position.x) * 0.15;
    
    const heartModel = player.getObjectByName("heartModel");
    const time = Date.now() * 0.005;
    if(heartModel) {
        const scale = 1 + Math.sin(time * 1.5) * 0.08;
        heartModel.scale.set(scale, scale, scale);
        const targetTilt = (player.position.x - targetX) * 0.1;
        heartModel.rotation.z = targetTilt;
        heartModel.rotation.y = Math.sin(time) * 0.15;
    }

    roadGroup.position.z += GAME_SPEED;
    if(roadGroup.position.z > 100) roadGroup.position.z = 0;

    for (let i = obstacles.length - 1; i >= 0; i--) {
        const obs = obstacles[i];
        obs.mesh.position.z += GAME_SPEED;

        let colWidth = 1.0;
        if (obs.mesh.userData.type === 'car') colWidth = 2.5;

        if (Math.abs(player.position.x - obs.mesh.position.x) < colWidth) {
            if (obs.mesh.position.z > -1.5 && obs.mesh.position.z < 1.5) {
                const obsHeight = obs.mesh.userData.height || 1.5;
                if (player.position.y < obsHeight) {
                    gameOver();
                }
            }
        }

        if (obs.mesh.position.z > 8) {
            scene.remove(obs.mesh);
            obstacles.splice(i, 1);
        }
    }

    spawnDistanceTimer -= GAME_SPEED;
    if (spawnDistanceTimer <= 0) {
        spawnObstaclePattern(-120);
        spawnDistanceTimer = MIN_DISTANCE_BETWEEN_OBS + Math.random() * 20;
    }

    const positions = snowSystem.geometry.attributes.position.array;
    for(let i = 1; i < positions.length; i+=3) {
        positions[i] -= 0.1; 
        if (positions[i] < 0) positions[i] = 30;
    }
    snowSystem.geometry.attributes.position.needsUpdate = true;

    score += 1; 
    scoreEl.innerText = score;

    if (score > 100 && score % 2000 > 0 && score % 2000 < 5 && Math.random() < 0.1) {
        showFloatingMessage();
    }

    if (score >= TARGET_SCORE) {
        gameWin();
    }

    renderer.render(scene, camera);
}

function startGame() {
    document.getElementById('start-screen').classList.add('hidden');
    resetGameParams();
    gameActive = true;
    animate();
}

function resetGameParams() {
    score = 0;
    currentLane = 1;
    scoreEl.innerText = '0';
    roadGroup.position.z = 0;
    
    isJumping = false;
    player.position.y = GROUND_Y;
    
    obstacles.forEach(ob => scene.remove(ob.mesh));
    obstacles = [];
    
    spawnDistanceTimer = 30;
}

function resetGame() {
    document.getElementById('win-screen').classList.add('hidden');
    document.getElementById('lose-screen').classList.add('hidden');
    document.getElementById('start-screen').classList.remove('hidden');
    gameActive = false;
    cancelAnimationFrame(frameId);
    renderer.render(scene, camera);
}

function gameOver() {
    gameActive = false;
    cancelAnimationFrame(frameId);
    document.getElementById('lose-screen').classList.remove('hidden');
}

function gameWin() {
    gameActive = false;
    cancelAnimationFrame(frameId);
    document.getElementById('win-screen').classList.remove('hidden');
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    // Recalculam Pixel Ratio la resize daca trecem de pe un monitor pe altul
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, isMobile ? 1.5 : 2));
}

init();
