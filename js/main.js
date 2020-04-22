window.onload = function () {
	var app = new Vue( {
		el: '#wrapper',
		computed: {
			playlistCount: function () {
				return this.playlist.length;
			}
		},
		data: {
			showOverlay: true,
			isLoading: false,
			activeTab: 1,
			isPlayer: document.location.hash === '#player',
			playerWindow: null,
			playlistWindow: null,

			// CSS properties
			searchListHeight: 0,
			playListHeight: 0,
			logoMarginTop: 0,

			playlist: [],
			searchResults: [],
			currentSong: null,
			player: null,
			searchKeyword: null,
			showPlayer: false,
			formData: {
				q: null
			}
		},
		mounted: function () {
			var vm = this;

			vm.formData.q = 'karaoke';
			vm.searchSong();

			if ( vm.isPlayer ) {

				// Create Youtube iFrame API instance
				this.player = new YT.Player( 'player', {
					height: '390',
					width: '640',
					events: {
						'onReady': function () {
							vm.showOverlay = false;
						},
						'onStateChange': function ( event ) {
							if ( event.data == YT.PlayerState.ENDED ) {
								// Request next song from playlist window
								vm.playlistWindow.postMessage( { youtubeokeEvent: 'finished' }, document.location.href );
							}
						}
					},
					playerVars: {
						rel: 0,
						showinfo: 0
					}
				} );
			} else {
				vm.showOverlay = false;
			}

			window.addEventListener( 'resize', vm.resizeList );
			window.addEventListener( 'message', vm.processMessage, false );
			vm.resizeList();
		},
		methods: {
			processMessage: function ( event ) {
				if ( event.data.hasOwnProperty( 'youtubeokeEvent' ) ) {
					if ( event.data.youtubeokeEvent === 'play' && event.data.song ) {
						this.player.loadVideoById( {
							videoId: event.data.song.id,
							rel: 0
						} );

						this.showPlayer = true;
						this.currentSong = event.data.song;
						this.playlistWindow = event.source;
					} else if ( event.data.youtubeokeEvent === 'finished' ) {
						var nextSong = this.playlist.shift();

						if ( nextSong ) {
							this.playSong( nextSong );
						}
					}
				}

				console.log( event );
			},
			addToPlaylist: function ( item ) {
				this.playlist.push( item );
			},
			searchSong: function () {
				var vm = this;

				vm.isLoading = true;

				axios.get( 'https://utubeoke-api.herokuapp.com', {
					params: this.formData
				} ).then( function ( response ) {
					vm.searchResults = [];

					if ( response.data.hasOwnProperty( 'items' ) && response.data.items.length > 0 ) {
						response.data.items.forEach( function ( item ) {
							vm.searchResults.push( {
								id: item.id.videoId,
								title: item.snippet.title,
								channel: item.snippet.channelTitle,
								image: item.snippet.thumbnails.medium.url
							} );
						} );
					}

					vm.isLoading = false;
				} );
			},
			playSongFromPlaylist: function ( song, index ) {
				this.deleteSong( index );
				this.playSong( song );
			},
			playSong: function ( song ) {
				if ( !this.playerWindow ) {
					return;
				}

				// Tell player window to play the song
				this.playerWindow.postMessage( { youtubeokeEvent: 'play', song: song }, document.location.href );
			},
			deleteSong: function ( index ) {
				this.playlist.splice( index, 1 );
			},
			showTab: function ( tabId ) {
				this.activeTab = tabId;
				var list = null;

				if ( tabId === 1 ) {
					list = document.getElementById( 'js-search-list' );
				} else if ( tabId === 2 ) {
					list = document.getElementById( 'js-play-list' );
				}

				if ( list !== null ) {
					setTimeout( function () {
						list.scrollTop = 0;
					}, 100 );
				}
			},
			resizeList: function () {
				this.searchListHeight = window.innerHeight - 150;
				this.playListHeight = window.innerHeight - 98;
				this.logoMarginTop = window.innerHeight / 2 - 160;
			},
			showPlayerTab: function () {
				if ( this.playerWindow ) {
					this.playerWindow.close();
				}

				this.playerWindow = window.open( document.location + '#player', '_blank' );
			}
		}
	} );
};

if ( document.location.hash !== '#player' ) {
	window.onbeforeunload = function ( e ) {
		e = e || window.event;

		// For IE and Firefox prior to version 4
		if ( e ) {
			e.returnValue = 'Are you sure? Your playlist will be gone.';
		}

		// For Safari
		return 'Are you sure? Your playlist will be gone.';
	};
}