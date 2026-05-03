fn preview_static_response(raw_path: &str) -> Option<(&'static str, &'static str, String)> {
    let dist_dir = preview_dist_dir()?;
    let path = raw_path.split('?').next().unwrap_or("/");
    let relative_path = path.trim_start_matches('/');

    if relative_path.is_empty() {
        return preview_read_static_file(&dist_dir.join("index.html"));
    }

    if relative_path
        .split('/')
        .any(|segment| segment.is_empty() || segment == "." || segment == ".." || segment.contains('\\'))
    {
        return None;
    }

    let asset_path = dist_dir.join(relative_path);
    if asset_path.is_file() {
        return preview_read_static_file(&asset_path);
    }

    if !relative_path.contains('.') {
        return preview_read_static_file(&dist_dir.join("index.html"));
    }

    None
}

fn preview_dist_dir() -> Option<PathBuf> {
    env::var("VOID_ATRIUM_WEB_DIST_DIR")
        .ok()
        .map(|value| value.trim().to_string())
        .filter(|value| !value.is_empty())
        .map(PathBuf::from)
        .filter(|path| path.is_dir())
}

fn preview_read_static_file(path: &Path) -> Option<(&'static str, &'static str, String)> {
    let content_type = preview_content_type(path);
    let body = fs::read_to_string(path).ok()?;
    Some(("200 OK", content_type, body))
}

fn preview_content_type(path: &Path) -> &'static str {
    match path.extension().and_then(|value| value.to_str()).unwrap_or_default() {
        "html" => "text/html; charset=utf-8",
        "js" => "application/javascript; charset=utf-8",
        "css" => "text/css; charset=utf-8",
        "json" => "application/json; charset=utf-8",
        "svg" => "image/svg+xml; charset=utf-8",
        "map" => "application/json; charset=utf-8",
        "txt" => "text/plain; charset=utf-8",
        _ => "text/plain; charset=utf-8",
    }
}
