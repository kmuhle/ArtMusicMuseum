const texture_loader = new THREE.TextureLoader();

class Artwork {
    constructor(scene, art, position, rotation) {
        this.scene = scene;
        this.art = art;
        this.position = position;
        this.rotation = rotation;
        this.texture_loader = texture_loader;

        this.addArtWork();
    }

    async addArtWork() {
        const art_mesh = await this.loadArtTexture();
        const frame_mesh = await this.loadFrameTexture();
        const { label_mesh, label_height } = await this.createLabel();

        const group = new THREE.Group();
        
        art_mesh.position.set(0, 0, 0);
        group.add(art_mesh);

        frame_mesh.position.set(0, 0, 0.01);
        group.add(frame_mesh);

        label_mesh.position.set(0, -this.art.height/2 - label_height/2 - 0.3, 0);
        group.add(label_mesh);

        group.position.copy(this.position);
        group.rotation.y = this.rotation.y;
        this.scene.add(group);
    }

    loadArtTexture() {
        return new Promise(resolve => {
            this.texture_loader.load(this.art.image_url, texture => {
                const geo = new THREE.PlaneGeometry(this.art.width, this.art.height);
                const mat = new THREE.MeshStandardMaterial({ 
                    map: texture, 
                    side: THREE.DoubleSide 
                });
                resolve(new THREE.Mesh(geo, mat));
            });
        });
    }

    loadFrameTexture() {
        const frame_url = '/Assets/gold_frame.png';
        return new Promise(resolve => {
            this.texture_loader.load(frame_url, texture => {
                const geo = new THREE.PlaneGeometry(
                    this.art.width + 0.1, 
                    this.art.height + 0.1
                );
                const mat = new THREE.MeshStandardMaterial({ 
                    map: texture,
                    transparent: true,
                    side: THREE.DoubleSide
                });
                resolve(new THREE.Mesh(geo, mat));
            });
        });
    }

    async createLabel() {
        const plaqueTexture = await new Promise(resolve => {
            new THREE.TextureLoader().load('/Assets/plaque.png', resolve);
        });

        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        const padding = 40;
        const line_height_mult = 1.2;
        
        const canvas_width = 1024;
        canvas.width = canvas_width;
        
        const textBlocks = [
            { 
                text: this.art.title, 
                fontSize: 48,
                fontStyle: 'bold'
            },
            { 
                text: this.art.artist, 
                fontSize: 36,
                fontStyle: 'normal' 
            }
        ];
        
        let total_height = padding * 2;
        const max_text_width = canvas_width * 0.9;
        
        textBlocks.forEach(block => {
            context.font = `${block.fontStyle} ${block.fontSize}px Arial`;
            const lines = this.wrapText(context, block.text, max_text_width);
            total_height += lines.length * block.fontSize * line_height_mult;
        });
        
        canvas.height = total_height;
        
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = canvas_width;
        tempCanvas.height = total_height;
        const tempCtx = tempCanvas.getContext('2d');
        
        tempCtx.drawImage(plaqueTexture.image, 0, 0, canvas_width, total_height);
        
        tempCtx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        tempCtx.fillRect(0, 0, canvas_width, total_height);
        
        context.drawImage(tempCanvas, 0, 0);
        
        context.fillStyle = 'rgb(48,48,48)';
        context.textAlign = 'center';
        context.textBaseline = 'top';
        
        let currentY = padding;
        textBlocks.forEach(block => {
            context.font = `${block.fontStyle} ${block.fontSize}px Arial`;
            const lines = this.wrapText(context, block.text, max_text_width);
            
            lines.forEach(line => {
                context.shadowColor = 'rgba(0, 0, 0, 0.7)';
                context.shadowBlur = 6;
                context.shadowOffsetY = 2;
                
                context.fillText(line, canvas_width/2, currentY);
                
                context.shadowColor = 'transparent';
                
                currentY += block.fontSize * line_height_mult;
            });
        });
        
        const texture = new THREE.CanvasTexture(canvas);
        const label_width = this.art.width * 0.9;
        const label_height = label_width * (total_height / canvas_width);
        
        const geometry = new THREE.PlaneGeometry(label_width, label_height);
        const material = new THREE.MeshBasicMaterial({
            map: texture,
            transparent: true,
            side: THREE.DoubleSide
        });
        
        const label_mesh = new THREE.Mesh(geometry, material);
        return { label_mesh, label_height };
    }

    wrapText(context, text, max_width) {
        const words = text.split(' ');
        const lines = [];
        let curr_line = words[0];
        
        for (let i = 1; i < words.length; i++) {
            const test_line = curr_line + ' ' + words[i];
            const metrics = context.measureText(test_line);
            if (metrics.width <= max_width) {
                curr_line = test_line;
            } else {
                lines.push(curr_line);
                curr_line = words[i];
            }
        }
        lines.push(curr_line);
        return lines;
    }
}
