package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"path"
	"time"
)

type Deps struct {
	Ffmpeg *Ffmpeg
}

func main() {
	ffmpeg, err := NewFfmpeg()
	if err != nil {
		log.Fatalln(err)
	}

	d := &Deps{
		Ffmpeg: ffmpeg,
	}
	mux := http.NewServeMux()

	mux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		w.Write([]byte(`Hello world`))
	})

	mux.HandleFunc("/concat", func(w http.ResponseWriter, r *http.Request) {
		id := r.URL.Query().Get("id")
		if id == "" {
			w.WriteHeader(400)
			w.Write([]byte(`id is required`))
			return
		}

		ctx, cancel := context.WithTimeout(r.Context(), time.Minute*3)
		defer cancel()

		// Create the directory for current session ID
		err := os.MkdirAll("result/"+id, 0755)
		if err != nil {
			log.Printf("error: creating a directory: %v", err)
			w.WriteHeader(500)
			w.Write([]byte(err.Error()))
			return
		}

		files, err := d.acquireListOfFiles(ctx, id)
		if err != nil {
			log.Printf("acquiring list of files: %v", err)
			w.WriteHeader(500)
			w.Write([]byte(err.Error()))
			return
		}

		outputCombinedWebmFile, err := d.concatFiles(id, files)
		if err != nil {
			log.Printf("concatenating files: %v", err)
			w.WriteHeader(500)
			w.Write([]byte(err.Error()))
			return
		}

		outputMp4File := path.Join("result", id, "combined.mp4")

		_, err = d.Ffmpeg.Convert(ctx, outputCombinedWebmFile, outputMp4File)
		if err != nil {
			log.Printf("error: converting webm to mp4: %v", err)
			w.WriteHeader(500)
			w.Write([]byte(err.Error()))
			return
		}

		log.Printf("done: uploaded file for %s to %s", id, outputMp4File)
		w.WriteHeader(200)
		w.Write([]byte("done"))
	})

	server := &http.Server{
		Addr:    ":8000",
		Handler: mux,
	}

	log.Printf("server started on %s", server.Addr)
	err = server.ListenAndServe()
	if err != nil {
		log.Println(err)
	}
}
