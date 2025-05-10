class MusicPlayer {
    constructor() {
        this.songs = {};
        this.song_csv = '/Assets/songs.csv';

        
        this.curr_year = null;
        this.curr_track_index = 0;
        this.audio = new Audio();
        this.is_playing = false;
        this.error_count = 0;
        this.max_errors = 5;
        this.is_switching = false;
        
        this.song_title_elem = document.getElementById('song_title');
        this.song_artist_elem = document.getElementById('song_artist');
        this.song_rank_elem = document.getElementById('song_rank');
        this.status_elem = document.getElementById('player_status');
        this.play_pause_button = document.getElementById('play_pause_button');
        this.volume_slider = document.getElementById("volume_slider");
        this.audio.volume = this.volume_slider.value;

        document.getElementById('play_pause_button').addEventListener('click', () => this.togglePlayPause());
        document.getElementById('next_song_button').addEventListener('click', () => this.skip());
        document.getElementById('prev_song_button').addEventListener('click', () => this.previous());

        
        
        this.setupEventListeners();
        this.readInSongs();
    }

    setupEventListeners() {
        this.audio.addEventListener('ended', () => { this.handleTrackEnd(); });
        
        this.audio.addEventListener('error', () => { this.handlePlayError(); });
        
        this.audio.addEventListener('play', () => {
            this.is_playing = true;
        });

        this.volume_slider.addEventListener('input', (e) => {
            this.audio.volume = e.target.value;
        });

    }

    async readInSongs() {
        try {
            const res = await fetch(this.song_csv);
            if (!res.ok) throw new Error(res.statusText);
            const text = await res.text();
            this.parseCsv(text);
            
            if (Object.keys(this.songs).length > 0) {
                this.curr_year = Object.keys(this.songs)[0];
            }
        } catch (err) {
            console.error('Could not load CSV:', err);
        }
    }

    splitCsvLine(line) {
        return line.match(/("([^"]|"")*"|[^,]+)/g)            
                 .map(field => field[0] === '"' 
                     ? field.slice(1, -1).replace(/""/g, '"')  
                     : field);
    }

    parseCsv(text) {
        const lines = text.trim().split('\n');
        lines.shift(); 
        
        for (let line of lines) {
            if (!line.trim()) continue;

            const [rank_string, title, artist, year, url] = this.splitCsvLine(line);
            const rank = Number(rank_string);

            if (!this.songs[year]) {
                this.songs[year] = [];
            }

            this.songs[year].push({ rank, title, artist, url });
        }

        for (let year in this.songs) {
            this.songs[year].sort((a, b) => a.rank - b.rank);
        }
    }

    async play() {
        if (this.is_switching) return;

        this.is_switching = true;

        if (!this.curr_year || this.error_count >= this.max_errors) {
            return;
        }

        const track = this.songs[this.curr_year][this.curr_track_index];
        if (!track) {
            this.skip();
            return;
        }

        this.updateSongInfo(track);

        const valid_url = await this.verifyUrl(track.url);
        if (!valid_url) {
            console.warn(`Skipping invalid URL: ${track.url}`);
            this.is_switching = false;
            this.skip();
            return;
        }

        try {

            this.audio.pause();
            this.audio.currentTime = 0;

            this.audio.src = track.url;
            
            this.error_count = 0;
            
            const play_promise = this.audio.play();
            
            if (play_promise !== undefined) {
                await play_promise;
            }
            
        } catch (error) {
            console.error('Playback error:', error);
            this.skip();
        } finally {
            this.is_switching = false;
        }
    }

    async verifyUrl(url) {
        try {
            const response = await fetch(url, { method: 'HEAD' });
            return response.ok;
        } catch {
            return false;
        }
    }

    pause() {
        if (this.is_playing) {
            this.audio.pause();
            this.is_playing = false;
        } 
    }

    togglePlayPause() {
        if (this.is_playing) {
            this.pause();
            this.play_pause_button.textContent = "⏵";
        } else {
            this.play();
            this.play_pause_button.textContent = "⏸";
        }
    }

    handleTrackEnd() {
        this.is_playing = false;
        this.skip();
    }

    handlePlayError() {
        this.is_playing = false;
        this.error_count++;
        this.audio.src = ''; 
        
        if (this.error_count < this.max_errors) {
            setTimeout(() => this.skip(), 1000);
        } 
    }

    skip() {
        if (!this.curr_year) return;
        
        this.curr_track_index++;
        if (this.curr_track_index >= this.songs[this.curr_year].length) {
            this.curr_track_index = 0;
        }
        
        this.play();
    }

    previous() {
        if (!this.curr_year) return;
        
        this.curr_track_index--;
        if (this.curr_track_index < 0) {
            this.curr_track_index = this.songs[this.curr_year].length - 1;
        }
        
        this.play();
    }

    year_change(year) {
        if (this.songs[year]) {
            const was_playing = this.is_playing;

            this.error_count = 0;
            
            this.curr_year = year;
            this.curr_track_index = 0;
            
            this.audio.pause();
            this.audio.currentTime = 0;
            this.is_playing = false;

            const track = this.songs[year][this.curr_track_index];
            this.updateSongInfo(track);
            
            if (was_playing){
                // this.play();
                setTimeout(() => this.play(), .1);
            }
            
            return true;
        }
        
        console.error(`No songs for year ${year}`);
        return false;
    }

    updateSongInfo(track) {
        this.song_title_elem.textContent = track.title;
        this.song_artist_elem.textContent = track.artist;
        this.song_rank_elem.textContent = `${this.curr_year}— Rank #${track.rank}`;
    }

}
