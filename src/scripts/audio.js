function playClick() {
    const sound = document.getElementById('clickSound');
    sound.play().catch(error => {
        console.error('Error playing click sound:', error);
    });
}

function playOpen() {
    const sound = document.getElementById('openSound');
    sound.play().catch(error => {
        console.error('Error playing open sound:', error);
    });
}

function playChange() {
    const sound = document.getElementById('changeSound');
    sound.play().catch(error => {
        console.error('Error playing change sound:', error);
    });
}

const musicPlayer = {
    tracks: [
        { name: 'OneShot OST - On Little Cat Feet', src: 'assets/audio/music/osost_onlcf.mp3' },
        { name: 'Koosen - Without Return', src: 'assets/audio/music/k_wr.mp3' },
        { name: 'Austin Chen - Faces', src: 'assets/audio/music/ac_f.mp3' }
    ],
    currentTrackIndex: 0,
    audioElement: document.getElementById('music-track'),
    isPlaying: false,

    init() {
        const player = document.getElementById('music-player');
        const playPauseBtn = document.getElementById('play-pause');
        const prevBtn = document.getElementById('prev-track');
        const nextBtn = document.getElementById('next-track');
        const volumeSlider = document.getElementById('volume-slider');
        const closeBtn = document.querySelector('.close-player-btn');
        const currentTrackDisplay = document.getElementById('current-track');

        this.audioElement.volume = volumeSlider.value;

        this.loadTrack(this.currentTrackIndex);

        playPauseBtn.addEventListener('click', () => this.togglePlayPause());
        prevBtn.addEventListener('click', () => this.prevTrack());
        nextBtn.addEventListener('click', () => this.nextTrack());
        volumeSlider.addEventListener('input', () => {
            this.audioElement.volume = volumeSlider.value;
        });
        closeBtn.addEventListener('click', () => {
            this.stop();
            player.classList.remove('active');
        });

        this.audioElement.addEventListener('ended', () => {
            this.nextTrack();
        });
    },

    loadTrack(index) {
        const track = this.tracks[index];
        this.audioElement.src = track.src;
        const currentTrackDisplay = document.getElementById('current-track');
        currentTrackDisplay.textContent = track.name || 'Unknown Track';
        currentTrackDisplay.title = track.name || 'Unknown Track';
    },

    togglePlayPause() {
        const playPauseBtn = document.getElementById('play-pause');
        if (this.isPlaying) {
            this.audioElement.pause();
            playPauseBtn.innerHTML = '<i class="fas fa-play"></i>';
        } else {
            this.audioElement.play().catch(error => {
                console.error('Error playing track:', error);
            });
            playPauseBtn.innerHTML = '<i class="fas fa-pause"></i>';
        }
        this.isPlaying = !this.isPlaying;
    },

    prevTrack() {
        this.currentTrackIndex = (this.currentTrackIndex - 1 + this.tracks.length) % this.tracks.length;
        this.loadTrack(this.currentTrackIndex);
        if (this.isPlaying) {
            this.audioElement.play().catch(error => {
                console.error('Error playing track:', error);
            });
        }
    },

    nextTrack() {
        this.currentTrackIndex = (this.currentTrackIndex + 1) % this.tracks.length;
        this.loadTrack(this.currentTrackIndex);
        if (this.isPlaying) {
            this.audioElement.play().catch(error => {
                console.error('Error playing track:', error);
            });
        }
    },

    stop() {
        this.audioElement.pause();
        this.audioElement.currentTime = 0;
        this.isPlaying = false;
        document.getElementById('play-pause').innerHTML = '<i class="fas fa-play"></i>';
    }
};

document.addEventListener('DOMContentLoaded', () => {
    musicPlayer.init();
});