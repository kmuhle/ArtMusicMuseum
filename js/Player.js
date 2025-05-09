class Player {
    constructor(museum, controls, camera, scene, collision_detector) {
        this.museum = museum
        this.controls = controls;
        this.camera = camera;
        this.scene = scene;
        this.collision_detector = collision_detector;

        this.player_obj = this.controls.getObject();

        console.log(collision_detector)
        console.log(this.controls)
        console.log(this.player_obj)
        console.log(this.player_obj.position)

        
        this.velocity = new THREE.Vector3();
        this.direction = new THREE.Vector3();
        this.move_forward = false;
        this.move_backward = false;
        this.move_left = false;
        this.move_right = false;
        this.prev_time = performance.now();
        this.prev_position = new THREE.Vector3();
        this.speed = 50;

        this.num_rooms = 0;

        
        this.setupControls();

        
        this.player_obj.position.set(0, 3, 5);
        
        this.player_obj.rotation.y = Math.PI;
    }

    setupControls() {
        document.addEventListener('keydown', (e) => this.onKeyDown(e));
        document.addEventListener('keyup', (e) => this.onKeyUp(e));
    }

    onKeyDown(event) {
        if (this.controls.isLocked) {
            switch (event.code) {
                case 'ArrowUp':
                case 'KeyW': this.move_forward = true; break;
                case 'ArrowLeft':
                case 'KeyA': this.move_left = true; break;
                case 'ArrowDown':
                case 'KeyS': this.move_backward = true; break;
                case 'ArrowRight':
                case 'KeyD': this.move_right = true; break;
                case 'Escape': this.controls.unlock(); break;
                case 'Space': this.controls.unlock(); break;
            }
        }
    }

    onKeyUp(event) {
        if (this.controls.isLocked) {
            switch (event.code) {
                case 'ArrowUp':
                case 'KeyW': this.move_forward = false; break;
                case 'ArrowLeft':
                case 'KeyA': this.move_left = false; break;
                case 'ArrowDown':
                case 'KeyS': this.move_backward = false; break;
                case 'ArrowRight':
                case 'KeyD': this.move_right = false; break;
            }
        }
    }

    update() {
        const player = this.player_obj;

        const now = performance.now();
        const delta = (now - this.prev_time) / 1000;
        this.prev_time = now;
        
        if (this.controls.isLocked) {
    
            this.prev_position.copy(this.player_obj.position);
    
            this.velocity.x -= this.velocity.x * 5.0 * delta;
            this.velocity.z -= this.velocity.z * 5.0 * delta;
            this.velocity.y -= 9.8 * 2.0 * delta;

            this.direction.z = this.move_forward - this.move_backward;
            this.direction.x = this.move_right - this.move_left;
            this.direction.normalize();

            if (this.move_forward || this.move_backward)
                this.velocity.z -= this.direction.z * this.speed * delta;
            if (this.move_left || this.move_right)
                this.velocity.x -= this.direction.x * this.speed * delta;

            this.controls.move_right(-this.velocity.x * delta);
            this.controls.move_forward(-this.velocity.z * delta);
            this.player_obj.position.y += (this.velocity.y * delta);

            player.position.x = Math.max(-7, Math.min(7, player.position.x)); 
            player.position.z = Math.max(0.5, Math.min(this.museum_length - 0.5, player.position.z)); 
        
            if (player.position.y < 3) {
                this.velocity.y = 0;
                player.position.y = 3;
            }
            if (this.collision_detector.checkCollision(player.position)) {
                player.position.copy(this.prev_position);
            }
        }
        return player.position.z
    }

    changePlayerPosition(new_pos){
        // this.player_obj.position.z = new_pos;
        this.player_obj.position.set(0, 3, new_pos + 5);
        this.update();
    }

    updateRoomBounds(num_rooms, museum_length){
        this.num_rooms = num_rooms
        this.museum_length = museum_length
    }
}
