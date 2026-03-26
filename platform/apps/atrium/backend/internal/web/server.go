package web

import (
	"bytes"
	"io/fs"
	"net/http"
	"os"
	"path"
	"strings"
	"time"
)

func Handler() http.Handler {
	if devURL := strings.TrimSpace(os.Getenv("FRONTEND_DEV_URL")); devURL != "" {
		return devRedirectHandler(devURL)
	}

	dist, err := fs.Sub(assets, "dist")
	if err != nil {
		return http.NotFoundHandler()
	}
	fileServer := http.FileServer(http.FS(dist))

	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet && r.Method != http.MethodHead {
			http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
			return
		}

		if r.URL.Path == "/" {
			serveIndex(w, r, dist)
			return
		}

		clean := path.Clean(strings.TrimPrefix(r.URL.Path, "/"))
		if clean == "." || strings.HasPrefix(clean, "..") {
			http.NotFound(w, r)
			return
		}

		if handle, err := dist.Open(clean); err == nil {
			_ = handle.Close()
			fileServer.ServeHTTP(w, r)
			return
		}

		serveIndex(w, r, dist)
	})
}

func serveIndex(w http.ResponseWriter, r *http.Request, dist fs.FS) {
	data, err := fs.ReadFile(dist, "index.html")
	if err != nil {
		http.NotFound(w, r)
		return
	}
	http.ServeContent(w, r, "index.html", time.Time{}, bytes.NewReader(data))
}

func devRedirectHandler(base string) http.Handler {
	base = strings.TrimRight(base, "/")
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet && r.Method != http.MethodHead {
			http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
			return
		}

		target := base + r.URL.Path
		if r.URL.RawQuery != "" {
			target += "?" + r.URL.RawQuery
		}
		http.Redirect(w, r, target, http.StatusTemporaryRedirect)
	})
}
