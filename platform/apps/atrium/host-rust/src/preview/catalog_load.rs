fn load_preview_catalog() -> PreviewCatalog {
    let client_root_path = env::var("VOID_ATRIUM_CLIENT_ROOT_PATH")
        .ok()
        .or_else(|| env::var("ATRIUM_CLIENT_ROOT_PATH").ok())
        .unwrap_or_else(|| ".".to_string());
    let widgets_path = env::var("VOID_ATRIUM_WIDGETS_PATH")
        .ok()
        .or_else(|| env::var("ATRIUM_WIDGETS_PATH").ok())
        .unwrap_or_default();
    let client_root = PathBuf::from(&client_root_path);

    let mut spaces = load_preview_spaces(&client_root.join("spaces"));
    if spaces.is_empty() {
        spaces.push(default_preview_space());
    }

    let mut templates = load_preview_templates(&client_root.join("templates"));
    if templates.is_empty() {
        let template = default_preview_template();
        templates.insert(template.key.clone(), template);
    }

    let widgets_source = if widgets_path.trim().is_empty() {
        String::new()
    } else {
        fs::read_to_string(&widgets_path).unwrap_or_default()
    };

    PreviewCatalog {
        client_root_path,
        widgets_path,
        spaces,
        templates,
        resource_count: list_yaml_files(&client_root.join("resources")).len(),
        placement_count: list_yaml_files(&client_root.join("placements")).len(),
        widget_count: parse_widgets_count(&widgets_source),
    }
}
