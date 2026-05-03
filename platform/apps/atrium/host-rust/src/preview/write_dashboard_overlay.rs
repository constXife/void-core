fn preview_hidden_block_ids(state: &PreviewState, space: &PreviewSpace) -> Vec<String> {
    let viewer = preview_viewer();
    load_preview_dashboard_hidden_blocks(&state.client_root_dir(), &viewer.user_id, &space.id)
}

fn load_preview_dashboard_hidden_blocks(
    client_root: &Path,
    user_id: &str,
    space_id: &str,
) -> Vec<String> {
    let path = preview_dashboard_overlay_path(client_root, user_id, space_id);
    let source = fs::read_to_string(&path)
        .ok()
        .filter(|value| !value.trim().is_empty())
        .or_else(|| fs::read_to_string(preview_legacy_dashboard_overlay_path(client_root, space_id)).ok())
        .unwrap_or_default();
    parse_string_list(&source, "hidden_blocks")
}

fn write_preview_dashboard_hidden_blocks(
    client_root: &Path,
    user_id: &str,
    space_id: &str,
    hidden_block_ids: &[String],
) -> std::io::Result<()> {
    let path = preview_dashboard_overlay_path(client_root, user_id, space_id);
    if hidden_block_ids.is_empty() {
        if path.exists() {
            fs::remove_file(path)?;
        }
        return Ok(());
    }
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent)?;
    }
    let mut lines = vec!["hidden_blocks:".to_string()];
    for block_id in hidden_block_ids {
        lines.push(format!("  - {}", yaml_string(block_id)));
    }
    lines.push(String::new());
    fs::write(path, lines.join("\n"))
}

fn preview_dashboard_overlay_path(client_root: &Path, user_id: &str, space_id: &str) -> PathBuf {
    let user_key = preview_filesystem_key(user_id, "user");
    let space_key = preview_filesystem_key(space_id, "space");
    client_root
        .join("user-overlays")
        .join(user_key)
        .join(format!("{space_key}.yaml"))
}

fn preview_legacy_dashboard_overlay_path(client_root: &Path, space_id: &str) -> PathBuf {
    client_root
        .join("dashboard-overrides")
        .join(format!("{space_id}.yaml"))
}

fn preview_filesystem_key(value: &str, fallback: &str) -> String {
    let slug = slugify(value);
    if slug.is_empty() {
        fallback.to_string()
    } else {
        slug
    }
}
