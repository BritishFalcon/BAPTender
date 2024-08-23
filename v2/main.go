package main

import (
	"log"
	"net/http"
)

func noCache(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Cache-Control", "no-store")
		next.ServeHTTP(w, r)
	})
}

func main() {
	http.HandleFunc("/ws", Handler)

	// serve static files
	fsJS := http.FileServer(http.Dir("js"))
	http.Handle("/js/", http.StripPrefix("/js/", fsJS))
	fsTemplates := http.FileServer(http.Dir("templates"))
	http.Handle("/", noCache(fsTemplates))

	log.Printf("[MAIN] - Starting server on port 5001")
	log.Fatal(http.ListenAndServe(":5001", nil))
}
