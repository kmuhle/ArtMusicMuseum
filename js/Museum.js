class Museum {
    constructor() {}

    async setUpMuseum() {
        try {
            this.music_player = new MusicPlayer();
            this.prev_music_playing = true;

            this.scene = new THREE.Scene();
            this.scene.background = new THREE.Color(0x000000);

            this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
            this.camera.position.y = 2;

            this.renderer = new THREE.WebGLRenderer({ antialias: true,  });
            this.renderer.setPixelRatio(window.devicePixelRatio);
            this.renderer.setSize(window.innerWidth, window.innerHeight);
            document.body.appendChild(this.renderer.domElement);

            this.label_renderer = new THREE.CSS2DRenderer();
            this.label_renderer.setSize(window.innerWidth, window.innerHeight);
            this.label_renderer.domElement.style.position = 'absolute';
            this.label_renderer.domElement.style.top = '0';
            document.body.appendChild(this.label_renderer.domElement);

            this.controls = new THREE.PointerLockControls(this.camera, document.body);
            this.collision_detector = new CollisionDetector(this.scene);
            
            this.player = new Player(this, this.controls, this.camera, this.scene, this.collision_detector);
            this.rooms = {};
            this.num_rooms = 0;
            this.room_length = 50;
            this.years = Array.from({ length: 50 }, (_, i) => 1960 + i);
            console.log(this.years);
            this.loaded_years = this.years.slice(0, 10);
            console.log(this.loaded_years);
            this.decade = 1960;

            this.last_room = 0;
            this.current_room = 0;
            this.player_pos = 0;
            this.paused = false;
            this.loading_elem = document.getElementById('loading_decade');
            this.year_display = document.getElementById('year_display');
            this.decade_display = document.getElementById('decade_display');
            this.year_display.textContent = 1960;
            this.curr_decade = 1960;


            this.cache_key = 'museum_art_data_dict';
            this.artworks = {};

            this.clearCache();

            this.setupLights();
            await this.loadArtworks();
            this.setupEventListeners();

            this.animate();
            return true; 
        } catch (error) {
            console.error("Museum setup failed:", error);
            throw error;
        }
    }
    

    cacheArtworks(data) {
        localStorage.setItem(this.cache_key, JSON.stringify(data));
    }


    getCachedArtworks() {
        try {
          const cached = localStorage.getItem(this.cache_key);
          if (!cached) return null;
          
          return JSON.parse(cached); 
        } catch (e) {
          console.error("Failed to load artwork from cache", e);
          return null;
        }
      }

    clearCache() {
        localStorage.removeItem(this.cache_key);
        console.log("Cache cleared");
    }


    async getArtworksByYear(year, limit = 60) {
        let artworks = [];
        let unique_artworks = [];
        const query = {
            query: {
                bool: {
                    must: [
                        { terms: { artwork_type_id: [1, 14] } }, // Paintings & Watercolor
                        { 
                            bool: {
                                should: [
                                    { range: { date_end: { gte: year, lte: year } } },
                                    { range: { date_start: { gte: year, lte: year } } }
                                ]
                            }
                        }
                    ],
                    filter: [
                        { exists: { field: "image_id" } }
                    ]
                }
            },
            fields: ["id", "title", "artist_display", "date_display",   
                "date_end", "image_id", "short_description", "api_link", 
                "thumbnail", "artwork_type_id", "artwork_type_title"], 
            limit: limit,
        };

        try {
            const response = await fetch("https://api.artic.edu/api/v1/artworks/search", {
                method: "POST",
                mode: "cors",    
                headers: { "Content-Type": "application/json", "Accept": "application/json"},
                body: JSON.stringify(query)
            });
    
            if (!response.ok) throw new Error(`HTTP error: ${response.status}`);
            
            const { data } = await response.json();

            const base_width = 4; 
            const max_total_height = 7.5; 
            const plaque_height_factor = 0.2; 
            const gap = 0.3; 

            const artwork_promises = data.map(async (art) => {
                let width = base_width;
                let height = art.thumbnail 
                    ? Math.round(base_width * (art.thumbnail.height / art.thumbnail.width))
                    : base_width;
                
                const plaque_height = width * plaque_height_factor;
                const total_height = height + plaque_height + gap;
                
                if (total_height > max_total_height) {
                    const scale_factor = max_total_height / total_height;
                    width = Math.round(width * scale_factor);
                    height = Math.round(height * scale_factor);
                }
                
                if (!art.image_id) return null;
                
                const imageUrl = `https://www.artic.edu/iiif/2/${art.image_id}/full/843,/0/default.jpg`;

                return fetch(imageUrl, { method: 'GET' })
                    .then(response => {
                        if (response.status === 403) {
                        console.log("403");
                        return null;
                        } else if (!response.ok) {
                            console.log("not ok");
                            return null;
                        
                        } else {
                            console.log("Else passed");
                            return {};
                        }
                    })
                    .then(m => m === null
                        ? null
                        : {
                            id: art.id,
                            title: art.title,
                            // artist: art.artist_display,
                            artist: art.artist_display.replace(/\n/g, " — "),
                            date: art.date_display || year,
                            date_end: art.date_end,
                            date_start: art.date_start,
                            image_id: art.image_id,
                            image_url: imageUrl,
                            width,
                            height,
                            artwork_type_id: art.artwork_type_id,
                            artwork_type_title: art.artwork_type_title,
                          }
                      )
                    .catch(error => {
                        return null;
                    });
            });
            
            const potential_artworks = await Promise.all(artwork_promises);
            console.log(potential_artworks);
            
            console.log(`\nBefore null removal = ${potential_artworks.length}`)
            artworks = potential_artworks.filter(art => art !== null);
            console.log(`After null removal = ${artworks.length}`)
            
            let seen = new Set();

            for (let art of artworks) {
                const key = `${art.title}~~~${art.artist}`;
                if (!seen.has(key)) {
                    seen.add(key);
                    unique_artworks.push(art);
                    if (unique_artworks.length >= 20) break; 
                }
            }
            console.log(`After unique removal = ${unique_artworks.length}`);
            console.log(unique_artworks);
            
        } catch (error) {
            console.error(`Failed to fetch artworks for ${year}:`, error);
        }

        await delay(1005);
        return unique_artworks;
    }

    async loadArtworks() {
        
        let year_artworks = [];
        this.artworks = {};

        let cached_artworks = this.getCachedArtworks();
        
        if(cached_artworks != null){
            console.log("cached_artwork is not null")
            this.artworks = cached_artworks;
            
        }
        for (let year of this.years) {
            console.log(`In loop for year ${year}`);

            if (year in this.artworks){
                 year_artworks = this.artworks[year];
                 console.log(`Year is already in this.artworks: ${this.artworks[year]}`)
                 await delay(100);
            }
            else {
                year_artworks = await this.getArtworksByYear(year, 100)
                this.artworks[year] = year_artworks;
            }
            
            // this.rooms[year] = new Room(
            //     this.scene, 
            //     this.artworks[year], 
            //     this.num_rooms, 
            //     this.collision_detector, 
            //     this.room_length
            // );
            // this.num_rooms++;
            // this.player.updateRoomBounds(this.num_rooms, this.num_rooms * 50);
        }

        this.cacheArtworks(this.artworks)
        await this.loadRooms();
    }
    
    async loadRooms() {
        for (let year of this.loaded_years) {
            const room = new Room(
                this.scene, 
                this.artworks[year], 
                this.num_rooms, 
                this.collision_detector, 
                this.room_length
            );

            await new Promise(resolve => setTimeout(resolve, 20));
            
            this.rooms[year] = room;
            this.num_rooms++;
            this.player.updateRoomBounds(this.num_rooms, this.num_rooms * 50);
            console.log(this.num_rooms);
        }
    }

    async loadDecade(decade) {
        this.disposeRooms();
        this.loaded_years = Array.from({length: 10}, (_, i) => decade + i);
        this.curr_decade = decade;
        
        await this.loadRooms();
    }

    disposeRooms() {
        for (let year = this.curr_decade; year < this.curr_decade+10; year++) {
            if (this.rooms[year]) {
                this.rooms[year].dispose();
                delete this.rooms[year];
            }
        }
        this.num_rooms = 0;
    }


    setupLights() {
        const ambient_light = new THREE.AmbientLight(0x404040);
        this.scene.add(ambient_light);

        const directional_light1 = new THREE.DirectionalLight(0xffffff, 0.8);
        directional_light1.position.set(1, 1, 1);
        this.scene.add(directional_light1);

        const directional_light2 = new THREE.DirectionalLight(0xffffff, 0.5);
        directional_light2.position.set(-1, 1, -1);
        this.scene.add(directional_light2);

        const ceiling_light = new THREE.DirectionalLight(0xffffff, 0.5);
        ceiling_light.position.set(0, 10, 0);
        this.scene.add(ceiling_light);
    }

    setupEventListeners() {
        
        document.addEventListener('click', (e) => {
            const is_ui_click = e.target.closest('.ui') !== null;
            const is_tour_click = e.target.closest('.introjs-tooltip, .introjs-overlay, .introjs-helperLayer, .introjs-floatingElement') !== null;
            if (!is_ui_click && !is_tour_click && e.target.tagName !== 'BUTTON' && !this.controls.isLocked && !this.paused) {
                this.controls.lock();
            }
        });

        window.addEventListener('resize', () => this.onWindowResize());
    }

    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.label_renderer.setSize(window.innerWidth, window.innerHeight);
    }

    animate() {
        requestAnimationFrame(() => this.animate());
        
        if (this.paused) return;
        
        this.player_pos = this.player.update();
        this.last_room = this.current_room;
        this.current_room = Math.floor(this.player_pos / this.room_length);

        if (this.last_room !== this.current_room) {
            this.roomChanged();
        }

        this.renderer.render(this.scene, this.camera);
        this.label_renderer.render(this.scene, this.camera);
    }

    pause() {
        if (!this.paused){
            this.prev_music_playing = this.music_player.is_playing;
            if (this.prev_music_playing){ this.music_player.pause(); } 
        } else {
            if(this.prev_music_playing){ this.music_player.play();} 
        }
        this.paused = !this.paused;
        console.log(`Paused: ${this.paused}`);
    }

    roomChanged() {
        const year = this.loaded_years[this.current_room];
        this.year_display.textContent = year;
        this.decade_display.textContent = `${year - (year % 10)}s`
        this.music_player.year_change(year);
    }

    async change_year(change_amount){
        console.log(`Change amount = ${change_amount}`);
        const index = this.current_room + change_amount;
        const mod_index = mod(index, 10);
        console.log(`Mod index = ${mod_index}`);
        
        if(index < 0 || index >= this.num_rooms){
            let new_decade = this.curr_decade + (10 * change_amount);
            if(new_decade < 1960) { new_decade = 2000}
            else if (new_decade >= 2000){ new_decade = 1960}

            await this.newDecade(new_decade);
            this.player.changePlayerPosition(mod_index * this.room_length);
            console.log(`New year = ${this.loaded_years[mod_index]}`);
        } 
        else {
            this.player.changePlayerPosition(index * this.room_length);
        }
        this.roomChanged();
    }

    async nextDecade() {
        let new_decade = this.curr_decade + 10;
        if (new_decade > 2000) { new_decade = 1960; }
            await this.newDecade(new_decade);
            this.change_year(new_decade - this.loaded_years[this.current_room]);
            this.roomChanged();
            await delay(100);
    }

    async prevDecade() {
        console.log("Prev Decade");
        let new_decade = this.curr_decade - 10;
        if (new_decade < 1960) { new_decade = 2000; }
        await this.newDecade(new_decade);
        this.change_year(new_decade - this.loaded_years[this.current_room]);
        this.roomChanged();
        await delay(100);
    }

    async newDecade(new_decade) {
        this.loading_elem.textContent = `Loading Art for the ${new_decade}s...`;
        this.loading_elem.classList.remove('hidden');
        await this.loadDecade(new_decade);
        this.loading_elem.classList.add('hidden');
    }
}

function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function mod(n, m) {
    return ((n % m) + m) % m;
}
