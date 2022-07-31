package main

import (
	"context"
	"fmt"
	"io"
	"io/fs"
	"log"
	"os"
	"path"
)

func (d *Deps) acquireListOfFiles(ctx context.Context, id string) ([]string, error) {
	entries, err := fs.ReadDir(os.DirFS("../backend/Videos/"+id), ".")
	if err != nil {
		return []string{}, fmt.Errorf("reading directory: %w", err)
	}

	workDir, err := os.Getwd()
	if err != nil {
		return []string{}, fmt.Errorf("getting working directory: %w", err)
	}

	var out []string

	for _, entry := range entries {
		if entry.IsDir() {
			continue
		}

		fullPath := path.Join(workDir, "..", "backend", "Videos", id, entry.Name())

		out = append(out, fullPath)
	}

	return out, nil
}

func (d *Deps) putListOfFilesToFile(id string, files []string) (string, error) {
	filePath := path.Join("../backend/Videos/"+id, "videos.txt")
	f, err := os.Create(filePath)
	if err != nil {
		return "", fmt.Errorf("creating file: %w", err)
	}
	defer func() {
		err := f.Close()
		if err != nil {
			log.Printf("error closing file: %v", err)
		}
	}()

	for _, file := range files {
		_, err := f.WriteString("file '" + file + "'\n")
		if err != nil {
			return "", fmt.Errorf("writing buffer to file: %w", err)
		}
	}

	err = f.Sync()
	if err != nil {
		return "", fmt.Errorf("synchronizing file: %w", err)
	}

	return filePath, nil
}

func (d *Deps) concatFiles(id string, files []string) (string, error) {
	outputFilePath := path.Join("result", id, "output.webm")

	f, err := os.Create(outputFilePath)
	if err != nil {
		return "", fmt.Errorf("creating file: %w", err)
	}
	defer func() {
		err := f.Close()
		if err != nil {
			log.Printf("error closing file: %v", err)
		}
	}()

	for _, file := range files {
		r, err := os.Open(file)
		if err != nil {
			return "", fmt.Errorf("opening file: %w", err)
		}
		defer func() {
			err := r.Close()
			if err != nil {
				log.Printf("error closing file: %v", err)
			}
		}()

		body, err := io.ReadAll(r)
		if err != nil {
			return "", fmt.Errorf("reading file: %w", err)
		}

		fileInfo, err := f.Stat()
		if err != nil {
			return "", fmt.Errorf("Can't read file status: %w", err)
		}

		_, err = f.WriteAt(body, fileInfo.Size())
		if err != nil {
			return "", fmt.Errorf("writing buffer to file: %w", err)
		}
	}

	err = f.Sync()
	if err != nil {
		return "", fmt.Errorf("synchronizing file: %w", err)
	}

	return outputFilePath, nil
}
