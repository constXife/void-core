pub(crate) fn run_preview() {
    let listen_address = env::var("VOID_ATRIUM_WEB_LISTEN_ADDRESS")
        .ok()
        .filter(|value| !value.trim().is_empty())
        .unwrap_or_else(|| "127.0.0.1".to_string());
    let listen_port = env::var("VOID_ATRIUM_WEB_PORT")
        .ok()
        .filter(|value| !value.trim().is_empty())
        .unwrap_or_else(|| "8080".to_string());
    let socket = format!("{listen_address}:{listen_port}");
    let listener = TcpListener::bind(&socket)
        .unwrap_or_else(|error| panic!("atrium-host-rust: failed to bind {socket}: {error}"));
    let catalog = load_preview_catalog();
    let mut state = PreviewState::from_catalog(catalog);
    eprintln!("atrium-host-rust preview listening on {socket}");

    for stream in listener.incoming() {
        let Ok(mut stream) = stream else {
            continue;
        };
        let mut buffer = [0u8; 4096];
        let Ok(read) = stream.read(&mut buffer) else {
            continue;
        };
        if read == 0 {
            continue;
        }
        let request = String::from_utf8_lossy(&buffer[..read]);
        let line = request.lines().next().unwrap_or_default();
        let method = line.split_whitespace().next().unwrap_or("GET");
        let raw_path = line.split_whitespace().nth(1).unwrap_or("/");
        let body = request_body(&request);
        let (status, content_type, body) = preview_response(method, raw_path, body, &mut state);
        let response = format!(
            "HTTP/1.1 {status}\r\nContent-Type: {content_type}\r\nContent-Length: {}\r\nConnection: close\r\n\r\n{}",
            body.len(),
            body
        );
        let _ = stream.write_all(response.as_bytes());
    }
}
