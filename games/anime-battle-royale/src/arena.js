// Arena: flat ground + scattered cover, neon skybox, lights
import * as THREE from 'three';

export const ARENA_RADIUS = 70;     // playable circle radius (world units)
export const ARENA_HEIGHT = 24;     // sky dome height

export function buildArena(scene) {
    // Ground
    const groundGeo = new THREE.CircleGeometry(ARENA_RADIUS + 10, 96);
    const groundMat = new THREE.MeshStandardMaterial({
        color: 0x0a0a18, roughness: 0.95, metalness: 0.1,
        emissive: 0x110022, emissiveIntensity: 0.3
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = false;
    scene.add(ground);

    // Neon grid lines on ground
    const gridHelper = new THREE.GridHelper(ARENA_RADIUS * 2, 28, 0xff0080, 0x00ffee);
    gridHelper.material.transparent = true;
    gridHelper.material.opacity = 0.18;
    gridHelper.position.y = 0.01;
    scene.add(gridHelper);

    // Outer ring (neon edge)
    const ringGeo = new THREE.RingGeometry(ARENA_RADIUS, ARENA_RADIUS + 0.6, 96);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0x00ffee, side: THREE.DoubleSide });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.05;
    scene.add(ring);

    // Cover obstacles: scattered neon-edge cubes/pillars
    const cover = [];
    const numCover = 32;
    const colors = [0xff0080, 0x00ffee, 0xaa00ff, 0xeeff00];
    for (let i = 0; i < numCover; i++) {
        const r = 8 + Math.random() * (ARENA_RADIUS - 12);
        const ang = Math.random() * Math.PI * 2;
        const x = Math.cos(ang) * r;
        const z = Math.sin(ang) * r;
        const w = 1.6 + Math.random() * 2.2;
        const h = 2 + Math.random() * 4;
        const d = 1.6 + Math.random() * 2.2;
        const mat = new THREE.MeshStandardMaterial({
            color: 0x1a0a2a, roughness: 0.5, metalness: 0.3,
            emissive: colors[i % colors.length], emissiveIntensity: 0.4
        });
        const box = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
        box.position.set(x, h / 2, z);
        scene.add(box);
        cover.push({ mesh: box, x, z, halfW: w / 2 + 0.3, halfD: d / 2 + 0.3 });
    }

    // Lights
    const ambient = new THREE.AmbientLight(0x4422aa, 0.6);
    scene.add(ambient);

    const hemi = new THREE.HemisphereLight(0xff66cc, 0x000022, 0.5);
    scene.add(hemi);

    const dir = new THREE.DirectionalLight(0xffffff, 0.7);
    dir.position.set(30, 60, 20);
    scene.add(dir);

    // Sky color
    scene.background = new THREE.Color(0x05000f);
    scene.fog = new THREE.Fog(0x05000f, 50, 180);

    // Distant neon "buildings" on the horizon for visual depth
    for (let i = 0; i < 60; i++) {
        const ang = (i / 60) * Math.PI * 2;
        const dist = ARENA_RADIUS + 20 + Math.random() * 30;
        const h = 6 + Math.random() * 22;
        const w = 3 + Math.random() * 5;
        const c = colors[i % colors.length];
        const mat = new THREE.MeshBasicMaterial({ color: 0x000000 });
        const box = new THREE.Mesh(new THREE.BoxGeometry(w, h, w), mat);
        box.position.set(Math.cos(ang) * dist, h / 2, Math.sin(ang) * dist);
        scene.add(box);
        // edge glow
        const edges = new THREE.LineSegments(
            new THREE.EdgesGeometry(box.geometry),
            new THREE.LineBasicMaterial({ color: c })
        );
        edges.position.copy(box.position);
        scene.add(edges);
    }

    return { ground, cover };
}

// Returns true if (x,z) collides with any cover obstacle
export function collidesCover(cover, x, z, radius = 0.5) {
    for (const c of cover) {
        if (Math.abs(x - c.x) < c.halfW + radius && Math.abs(z - c.z) < c.halfD + radius) {
            return true;
        }
    }
    return false;
}
