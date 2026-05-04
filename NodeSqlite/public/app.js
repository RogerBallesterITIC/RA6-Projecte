function showMessage(elementId, message, type = "ok") {
  const messageDiv = document.getElementById(elementId);
  if (!messageDiv) return;
  
  messageDiv.textContent = message;
  messageDiv.className = `status-message ${type}`;
  messageDiv.style.display = "block";
}

function clearMessage(elementId) {
  const messageDiv = document.getElementById(elementId);
  if (!messageDiv) return;
  messageDiv.textContent = "";
  messageDiv.style.display = "none";
}

const artistForm = document.getElementById("artist-form");
const artistNameInput = document.getElementById("artist-name");
const loadArtistsBtn = document.getElementById("load-artists-btn");
const artistsOutput = document.getElementById("artists-output");
const editArtistDropdown = document.getElementById("edit-artist-dropdown");
const newArtistName = document.getElementById("new-artist-name");
const updateArtistBtn = document.getElementById("update-artist-btn");
const deleteArtistDropdown = document.getElementById("delete-artist-dropdown");
const deleteArtistBtn = document.getElementById("delete-artist-btn");

async function loadAllArtistDropdowns() {
  const artists = await consultTable("artists");
  [editArtistDropdown, deleteArtistDropdown, 
   document.getElementById("album-artist-dropdown"),
   document.getElementById("song-artist-dropdown")].forEach(dropdown => {
    if (dropdown) {
      dropdown.innerHTML = '<option value="">Selecciona un artista</option>';
      artists.forEach(artist => {
        const option = document.createElement("option");
        option.value = artist.id;
        option.textContent = artist.name;
        dropdown.appendChild(option);
      });
    }
  });
}

artistForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const name = artistNameInput.value.trim();
  if (!name) return;

  const res = await fetch("/api/AddArtist", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ data: name })
  });

  const message = await res.text();
  showMessage("artist-message", message, res.ok ? "ok" : "error");
  if (res.ok) {
    artistForm.reset();
    loadAllArtistDropdowns();
    loadArtists();
  }
});

updateArtistBtn.addEventListener("click", async () => {
  const oldName = editArtistDropdown.options[editArtistDropdown.selectedIndex]?.text;
  const newName = newArtistName.value.trim();

  const res = await fetch("/api/UpdateArtist", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ oldName, newName })
  });

  const message = await res.text();
  showMessage("artist-update-message", message, res.ok ? "ok" : "error");
  if (res.ok) {
    newArtistName.value = "";
    loadAllArtistDropdowns();
    loadArtists();
  }
});

deleteArtistBtn.addEventListener("click", async () => {
  const artistToDelete = deleteArtistDropdown.options[deleteArtistDropdown.selectedIndex]?.text;

  const res = await fetch("/api/DeleteArtist", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ data: artistToDelete })
  });

  const message = await res.text();
  showMessage("artist-delete-message", message, res.ok ? "ok" : "error");
  if (res.ok) {
    loadAllArtistDropdowns();
    loadArtists();
  }
});

async function loadArtists() {
  const artists = await consultTable("artists");
  artistsOutput.textContent = JSON.stringify(artists, null, 2);
}

loadArtistsBtn.addEventListener("click", loadArtists);

const albumArtistDropdown = document.getElementById("album-artist-dropdown");
const albumTitle = document.getElementById("album-title");
const albumYear = document.getElementById("album-year");
const addAlbumBtn = document.getElementById("add-album-btn");
const deleteAlbumDropdown = document.getElementById("delete-album-dropdown");
const deleteAlbumBtn = document.getElementById("delete-album-btn");
const loadAlbumsBtn = document.getElementById("load-albums-btn");
const albumsOutput = document.getElementById("albums-output");

async function loadAlbumDropdown() {
  const albums = await consultTable("albums");
  deleteAlbumDropdown.innerHTML = '<option value="">Selecciona un álbum</option>';
  albums.forEach(album => {
    const option = document.createElement("option");
    option.value = album.id;
    option.textContent = `${album.title} - ${album.artist_name || "Artista"}`;
    deleteAlbumDropdown.appendChild(option);
  });
}

addAlbumBtn.addEventListener("click", async () => {
  const artistId = albumArtistDropdown.value;
  const title = albumTitle.value.trim();
  const year = albumYear.value || null;


  const res = await fetch("/api/AddAlbum", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title, year, artistId })
  });

  const message = await res.text();
  showMessage("album-message", message, res.ok ? "ok" : "error");
  if (res.ok) {
    albumTitle.value = "";
    albumYear.value = "";
    loadAlbumDropdown();
    loadAlbums();
  }
});

deleteAlbumBtn.addEventListener("click", async () => {
  const albumId = deleteAlbumDropdown.value;

  const res = await fetch("/api/DeleteAlbum", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ albumId })
  });

  const message = await res.text();
  showMessage("album-delete-message", message, res.ok ? "ok" : "error");
  if (res.ok) {
    loadAlbumDropdown();
    loadAlbums();
  }
});

async function loadAlbums() {
  const albums = await consultTable("albums");
  albumsOutput.textContent = JSON.stringify(albums, null, 2);
}

loadAlbumsBtn.addEventListener("click", loadAlbums);

const songArtistDropdown = document.getElementById("song-artist-dropdown");
const songAlbumDropdown = document.getElementById("song-album-dropdown");
const songTitle = document.getElementById("song-title");
const addSongBtn = document.getElementById("add-song-btn");
const deleteSongDropdown = document.getElementById("delete-song-dropdown");
const deleteSongBtn = document.getElementById("delete-song-btn");
const loadSongsBtn = document.getElementById("load-songs-btn");
const songsOutput = document.getElementById("songs-output");

songArtistDropdown.addEventListener("change", async () => {
  const artistId = songArtistDropdown.value;
  if (!artistId) {
    songAlbumDropdown.innerHTML = '<option value="">Primer selecciona un artista</option>';
    return;
  }

  const res = await fetch("/api/albums/byArtist", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ artistId })
  });

  const json = await res.json();
  songAlbumDropdown.innerHTML = '<option value="">Selecciona un álbum</option>';
  json.result.forEach(album => {
    const option = document.createElement("option");
    option.value = album.id;
    option.textContent = album.title;
    songAlbumDropdown.appendChild(option);
  });
});

async function loadSongsDropdown() {
  const songs = await consultTable("songs");
  deleteSongDropdown.innerHTML = '<option value="">Selecciona una canción</option>';
  songs.forEach(song => {
    const option = document.createElement("option");
    option.value = song.id;
    option.textContent = `${song.title} - ${song.artist_name || "Artista"} (${song.album_title || "Álbum"})`;
    deleteSongDropdown.appendChild(option);
  });
}

addSongBtn.addEventListener("click", async () => {
  const albumId = songAlbumDropdown.value;
  const title = songTitle.value.trim();


  const res = await fetch("/api/AddSong", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title, albumId })
  });

  const message = await res.text();
  showMessage("song-message", message, res.ok ? "ok" : "error");
  if (res.ok) {
    songTitle.value = "";
    loadSongsDropdown();
    loadSongs();
  }
});

deleteSongBtn.addEventListener("click", async () => {
  const songId = deleteSongDropdown.value;


  const res = await fetch("/api/DeleteSong", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ songId })
  });

  const message = await res.text();
  showMessage("song-delete-message", message, res.ok ? "ok" : "error");
  if (res.ok) {
    loadSongsDropdown();
    loadSongs();
  }
});

async function loadSongs() {
  const songs = await consultTable("songs");
  songsOutput.textContent = JSON.stringify(songs, null, 2);
}

loadSongsBtn.addEventListener("click", loadSongs);

async function consultTable(table) {
  const endpoint = `/api/${table}`;
  
  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ data: table }) 
  });

  if (!res.ok) {
    console.error(`Error cargando tabla ${table}`);
    return [];
  }

  const json = await res.json();
  return json.result || [];
}

async function init() {
  await loadAllArtistDropdowns();
  await loadAlbumDropdown();
  await loadSongsDropdown();
}

init();