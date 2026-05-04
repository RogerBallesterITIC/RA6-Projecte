const express = require("express");
const fs = require("fs");
const path = require("path");
const sqlite3 = require("sqlite3").verbose();

const app = express();
const PORT = process.env.PORT || 3000;

const dataDir = path.join(__dirname, "data");
const dbPath = path.join(dataDir, "artists.db");

if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

const db = new sqlite3.Database(dbPath);

db.serialize(() => {
    db.run(`
        CREATE TABLE IF NOT EXISTS artists (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL UNIQUE
        )
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS albums (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            year INTEGER,
            artist_id INTEGER NOT NULL,
            FOREIGN KEY (artist_id) REFERENCES artists(id) ON DELETE CASCADE
        )
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS songs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            album_id INTEGER NOT NULL,
            FOREIGN KEY (album_id) REFERENCES albums(id) ON DELETE CASCADE
        )
    `);

    const initialArtists = ["Txarango", "Oques Grasses"];
    initialArtists.forEach(artist => {
        db.get("SELECT id FROM artists WHERE name = ?", [artist], (error, row) => {
            if (error) {
                console.log("Error comprovant dades inicials:", error.message);
                return;
            }
            if (!row) {
                db.run("INSERT INTO artists (name) VALUES (?)", [artist]);
            }
        });
    });
});

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

app.post("/api/AddArtist", (req, res) => {
    const name = req.body.data;
    if (!name) {
        return res.status(400).type("text").send("El nom de l'artista és requerit");
    }
    
    db.run("INSERT INTO artists (name) VALUES (?)", [name], function(error) {
        if (error) {
            if (error.message.includes("UNIQUE")) {
                res.status(409).type("text").send(`Error: L'artista "${name}" ja existeix`);
            } else {
                res.status(500).type("text").send(`Error: ${error.message}`);
            }
            return;
        }
        res.status(201).type("text").send(`Artista desat: ${name}`);
    });
});

app.post("/api/artists", (req, res) => {
    db.all("SELECT * FROM artists ORDER BY name ASC", (err, rows) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json({ result: rows });
    });
});

app.post("/api/DeleteArtist", (req, res) => {
    const artistToDelete = req.body.data;
    if (!artistToDelete) {
        return res.status(400).type("text").send("Nom d'artista requerit");
    }
    
    db.run("DELETE FROM artists WHERE name = ?", [artistToDelete], function(error) {
        if (error) {
            res.status(500).type("text").send(`Error: ${error.message}`);
            return;
        }
        if (this.changes === 0) {
            res.status(404).type("text").send(`Artista no trobat: ${artistToDelete}`);
            return;
        }
        res.status(200).type("text").send(`Artista eliminat: ${artistToDelete}`);
    });
});

app.post("/api/UpdateArtist", (req, res) => {
    const { oldName, newName } = req.body;
    if (!oldName || !newName) {
        return res.status(400).type("text").send("Es requereixen el nom antic i el nou nom");
    }
    
    db.run("UPDATE artists SET name = ? WHERE name = ?", [newName, oldName], function(error) {
        if (error) {
            if (error.message.includes("UNIQUE")) {
                res.status(409).type("text").send(`Error: L'artista "${newName}" ja existeix`);
            } else {
                res.status(500).type("text").send(`Error: ${error.message}`);
            }
            return;
        }
        if (this.changes === 0) {
            res.status(404).type("text").send(`Artista no trobat: ${oldName}`);
            return;
        }
        res.status(200).type("text").send(`Artista modificat: ${oldName} → ${newName}`);
    });
});

app.post("/api/AddAlbum", (req, res) => {
    const { title, year, artistId } = req.body;
    if (!title || !artistId) {
        return res.status(400).type("text").send("Títol i ID d'artista requerits");
    }
    
    db.run("INSERT INTO albums (title, year, artist_id) VALUES (?, ?, ?)", 
        [title, year || null, artistId], function(error) {
        if (error) {
            res.status(500).type("text").send(`Error: ${error.message}`);
            return;
        }
        res.status(201).type("text").send(`Álbum desat: ${title}`);
    });
});

app.post("/api/albums", (req, res) => {
    const query = `
        SELECT albums.*, artists.name as artist_name 
        FROM albums 
        JOIN artists ON albums.artist_id = artists.id 
        ORDER BY albums.title ASC
    `;
    db.all(query, (err, rows) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json({ result: rows });
    });
});

app.post("/api/albums/byArtist", (req, res) => {
    const artistId = req.body.artistId;
    if (!artistId) {
        return res.status(400).json({ error: "ID d'artista requerit" });
    }
    
    db.all("SELECT * FROM albums WHERE artist_id = ? ORDER BY year DESC", 
        [artistId], (err, rows) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json({ result: rows });
    });
});

app.post("/api/DeleteAlbum", (req, res) => {
    const albumId = req.body.albumId;
    if (!albumId) {
        return res.status(400).type("text").send("ID d'álbum requerit");
    }
    
    db.run("DELETE FROM albums WHERE id = ?", [albumId], function(error) {
        if (error) {
            res.status(500).type("text").send(`Error: ${error.message}`);
            return;
        }
        if (this.changes === 0) {
            res.status(404).type("text").send(`Álbum no trobat`);
            return;
        }
        res.status(200).type("text").send(`Álbum eliminat`);
    });
});

app.post("/api/AddSong", (req, res) => {
    const { title, albumId } = req.body;
    if (!title || !albumId) {
        return res.status(400).type("text").send("Títol i ID d'álbum requerits");
    }

    db.run("INSERT INTO songs (title, album_id) VALUES (?, ?)", 
        [title, albumId], function(error) {
        if (error) {
            res.status(500).type("text").send(`Error: ${error.message}`);
            return;
        }
        res.status(201).type("text").send(`Cançó desada: ${title}`);
    });
});

app.post("/api/songs", (req, res) => {
    const query = `
        SELECT songs.*, albums.title as album_title, artists.name as artist_name 
        FROM songs 
        JOIN albums ON songs.album_id = albums.id 
        JOIN artists ON albums.artist_id = artists.id 
        ORDER BY songs.title ASC
    `;
    db.all(query, (err, rows) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json({ result: rows });
    });
});

app.post("/api/songs/byAlbum", (req, res) => {
    const albumId = req.body.albumId;
    if (!albumId) {
        return res.status(400).json({ error: "ID d'álbum requerit" });
    }
    
    db.all("SELECT * FROM songs WHERE album_id = ? ORDER BY title ASC", 
        [albumId], (err, rows) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json({ result: rows });
    });
});

app.post("/api/DeleteSong", (req, res) => {
    const songId = req.body.songId;
    if (!songId) {
        return res.status(400).type("text").send("ID de cançó requerit");
    }
    
    db.run("DELETE FROM songs WHERE id = ?", [songId], function(error) {
        if (error) {
            res.status(500).type("text").send(`Error: ${error.message}`);
            return;
        }
        if (this.changes === 0) {
            res.status(404).type("text").send(`Cançó no trobada`);
            return;
        }
        res.status(200).type("text").send(`Cançó eliminada`);
    });
});

app.use((req, res) => {
    res.status(404).type("text").send("Ruta no trobada");
});

app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).type("text").send("Error intern del servidor");
});

app.listen(PORT, () => {
    console.log(`Servidor a http://localhost:${PORT}`);
});