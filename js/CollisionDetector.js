class CollisionDetector {
    constructor(scene) {
        this.walls = [];
        this.player_radius = 0.5; 
    }

    addWall(wall) {
        this.walls.push(wall);
    }

    checkCollision(position) {
        // console.log(position);
        let collision = false;
        const player_box = new THREE.Box3(
            new THREE.Vector3(
                position.x - this.player_radius,
                position.y - 1, 
                position.z - this.player_radius
            ),
            new THREE.Vector3(
                position.x + this.player_radius,
                position.y + 1,
                position.z + this.player_radius
            )
        );

        for (const wall of this.walls) {
            const wallBox = new THREE.Box3().setFromObject(wall);
            if (player_box.intersectsBox(wallBox)) {
                collision = true; 
            }
        }
        // console.log(collision)
        return collision; 
    }
}