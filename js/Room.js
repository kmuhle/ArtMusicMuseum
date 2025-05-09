class Room {
    constructor(scene, artworks, room_index, collision_detector, room_length) {
        this.scene = scene;
        this.artworks = artworks;
        this.room_index = room_index;
        this.collision_detector = collision_detector;

        this.room_length = room_length; 
        this.room_width = 15;  
        this.room_height = 10; 
        this.texture_loader = new THREE.TextureLoader();
        this.texture_scale = 0.2;
        this.room_offset = (this.room_index * this.room_length) + (this.room_length / 2);

        this.room_group = new THREE.Group();
        this.scene.add(this.room_group);

        this.createFloor();
        this.createCeiling();
        this.createWalls();
        this.placeArtworks();
        
    }

    createWalls() {
        // left wall 
        this.createWall(-this.room_width/2, this.room_offset, this.room_length, this.room_height, Math.PI/2);
        
        // right wall
        this.createWall(this.room_width/2, this.room_offset, this.room_length, this.room_height, -Math.PI/2);
        
        // back wall
        if (this.room_index === 9){
            this.createWall(0, this.room_offset + this.room_length/2, this.room_width, this.room_height, Math.PI);
        } else{
            this.createWallWithDoorway(0, this.room_offset + this.room_length/2, this.room_width, this.room_height, Math.PI);
        }
        
        // front wall
        if (this.room_index === 0) {
            this.createWall(0, 0, this.room_width, this.room_height, 0);
        }
    }

    createWall(x_pos, z_pos, width, height, rotation_y, y_pos = this.room_height/2) {
        const geometry = new THREE.PlaneGeometry(width, height);
        
        const texture = this.texture_loader.load('./Assets/wall_texture.jpg');
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.set(width * this.texture_scale, height * this.texture_scale);
        
        const material = new THREE.MeshStandardMaterial({ 
            map: texture,
            side: THREE.DoubleSide,
            roughness: 0.7
        });
        
        const wall = new THREE.Mesh(geometry, material);
        wall.position.set(x_pos, y_pos, z_pos);
        wall.rotation.y = rotation_y;

        this.room_group.add(wall);
        this.collision_detector.addWall(wall);

        return wall;
    }

    createWallWithDoorway(x_pos, z_pos, width, height, rotation_y) {
        const door_width = 3;
        const door_height = 6;
        const wall_segment_width = (width - door_width) / 2;

        let left_wall = this.createWall(
            x_pos - width/2 + wall_segment_width/2, 
            z_pos, 
            wall_segment_width, 
            height, 
            rotation_y
        );

        let right_wall = this.createWall(
            x_pos + width/2 - wall_segment_width/2, 
            z_pos, 
            wall_segment_width, 
            height, 
            rotation_y
        );

        let top_wall = this.createWall(
            x_pos, 
            z_pos, 
            door_width, 
            height - door_height, 
            rotation_y,
            height - (height - door_height)/2 
        );

        this.createDoorFrame(x_pos, z_pos, rotation_y, door_width, door_height);
    }

    createDoorFrame(x_pos, z_pos, rotation_y, width, height) {
        const frame_depth = 0.2;
        const frame_material = new THREE.MeshStandardMaterial({ color: 0x333333 });
        
        // left part of frame
        const left_frame_geometry = new THREE.BoxGeometry(frame_depth, height, frame_depth);
        const left_frame = new THREE.Mesh(left_frame_geometry, frame_material);
        left_frame.position.set(x_pos - width/2, height/2, z_pos);
        left_frame.rotation.y = rotation_y;
        this.room_group.add(left_frame);
        
        // right part of frame
        const right_frame_geometry = new THREE.BoxGeometry(frame_depth, height, frame_depth);
        const right_frame = new THREE.Mesh(right_frame_geometry, frame_material);
        right_frame.position.set(x_pos + width/2, height/2, z_pos);
        right_frame.rotation.y = rotation_y;
        this.room_group.add(right_frame);
        
        // top of frame
        const top_frame_geometry = new THREE.BoxGeometry(width, frame_depth, frame_depth);
        const top_frame = new THREE.Mesh(top_frame_geometry, frame_material);
        top_frame.position.set(x_pos, height, z_pos);
        top_frame.rotation.y = rotation_y;
        this.room_group.add(top_frame);
    }

    createFloor() {
        const floor_texture = this.texture_loader.load('./Assets/floor_texture.png');
        floor_texture.wrapS = THREE.RepeatWrapping;
        floor_texture.wrapT = THREE.RepeatWrapping;
        floor_texture.repeat.set(this.room_width * 0.2, this.room_length * 0.2);

        const geometry = new THREE.PlaneGeometry(this.room_width, this.room_length);
        geometry.rotateX(-Math.PI / 2);
        const material = new THREE.MeshStandardMaterial({ 
            map: floor_texture,
            roughness: 0.8
        });
        const floor = new THREE.Mesh(geometry, material);
        floor.position.z = this.room_offset;
        this.room_group.add(floor);
    }

    createCeiling() {
        const ceiling_texture = this.texture_loader.load('./Assets/wall_texture.jpg');
        ceiling_texture.wrapS = THREE.RepeatWrapping;
        ceiling_texture.wrapT = THREE.RepeatWrapping;
        ceiling_texture.repeat.set(this.room_width * 0.2, this.room_length * 0.2);

        const geometry = new THREE.PlaneGeometry(this.room_width, this.room_length);
        geometry.rotateX(Math.PI / 2);
        const material = new THREE.MeshStandardMaterial({ 
            map: ceiling_texture,
            roughness: 0.9
        });
        const ceiling = new THREE.Mesh(geometry, material);
        ceiling.position.set(0, this.room_height, this.room_offset);
        this.room_group.add(ceiling);
    }

    calculateArtworkPositions(num_artworks_per_wall) {
        const positions = [];
        const vertical_position = 5; 
        const spacing = this.room_length / (num_artworks_per_wall + 1);
        
        for (let i = 0; i < num_artworks_per_wall; i++) {
            const z_pos = this.room_offset - this.room_length/2 + (i + 1) * spacing;
            
            positions.push({
                position: new THREE.Vector3(-this.room_width/2 + 0.01, vertical_position, z_pos),
                rotation: new THREE.Euler(0, Math.PI/2, 0)
            });
    
            positions.push({
                position: new THREE.Vector3(this.room_width/2 - 0.01, vertical_position, z_pos),
                rotation: new THREE.Euler(0, -Math.PI/2, 0)
            });
        }
        return positions;
    }

    placeArtworks() {
        if (!this.artworks || this.artworks.length === 0) return;

        let num_to_display = Math.min(7, Math.ceil(this.artworks.length/2));
        const positions = this.calculateArtworkPositions(num_to_display); 
        
        this.artwork_groups = [];
        
        let loaded_count = 0;
        const max_per_frame = 2; 
        
        const loadArtwork = (index) => {
            if (index >= this.artworks.length || index >= positions.length) return;
            
            const art = this.artworks[index];
            const pos = positions[index];
            
            const artwork = new Artwork(
                this.room_group, art, pos.position, pos.rotation
            );
            
            this.artwork_groups.push(artwork.group);
            loaded_count++;
            
            if (loaded_count < this.artworks.length && loaded_count % max_per_frame === 0) {
                requestAnimationFrame(() => loadArtwork(loaded_count));
            } else {
                loadArtwork(loaded_count);
            }
        };
        
        loadArtwork(0);
    }


    dispose() {
        console.log(this.room_group);
        this.room_group.traverse(child => {
          if (child.isMesh) {
            child.geometry?.dispose();
      
            const mats = Array.isArray(child.material)
                       ? child.material
                       : [child.material];
            mats.forEach(mat => {
              mat.map?.dispose();
              mat.dispose();
            });
          }
        });
      
        this.scene.remove(this.room_group);
      
        if (this.room_group.clear) {
          this.room_group.clear();
        } else {
          while (this.room_group.children.length) {
            this.room_group.remove(this.room_group.children[0]);
          }
        }
        this.room_group = null;
        console.log(this.room_group);
      }
      
}
