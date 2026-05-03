fn preview_create_space(state: &mut PreviewState, body: &str) -> String {
    let title = extract_json_string(body, "title").unwrap_or_else(|| "Untitled".to_string());
    let id = extract_json_string(body, "slug")
        .or_else(|| extract_json_string(body, "id"))
        .filter(|value| !value.trim().is_empty())
        .unwrap_or_else(|| slugify(&title));
    if state.catalog.spaces.iter().any(|space| space.id == id) {
        return format!(
            "{{\"error\":\"space_already_exists\",\"space_id\":{}}}",
            json_string(&id)
        );
    }
    let space = PreviewSpace {
        title: localized_text(&format!("atrium.space.{id}.title"), &title, ""),
        state: "active".to_string(),
        space_type: extract_json_string(body, "type").unwrap_or_else(|| "staff".to_string()),
        layout: extract_json_string(body, "layout_mode").unwrap_or_else(|| "grid".to_string()),
        description: localized_text(
            &format!("atrium.space.{id}.description"),
            &extract_nested_json_string(body, "display_config", "description").unwrap_or_default(),
            "",
        ),
        groups: extract_json_string_array(body, "visibility_groups"),
        dashboard_template: "admin-default".to_string(),
        id,
    };
    if let Err(error) = write_preview_space_file(&state.client_root_dir(), &space) {
        return format!(
            "{{\"error\":\"space_write_failed\",\"message\":{}}}",
            json_string(&error.to_string())
        );
    }
    state.catalog.spaces.push(space.clone());
    state.catalog.spaces.sort_by(|left, right| left.id.cmp(&right.id));
    state.reload_catalog();
    preview_space_json(&space)
}

fn preview_patch_space(state: &mut PreviewState, space_id: &str, body: &str) -> (&'static str, &'static str, String) {
    let Some(space) = state.catalog.spaces.iter_mut().find(|space| space.id == space_id) else {
        return (
            "404 Not Found",
            "application/json; charset=utf-8",
            "{\"error\":\"space_not_found\"}".to_string(),
        );
    };
    if let Some(title) = extract_json_string(body, "title") {
        space.title = localized_text(&format!("atrium.space.{}.title", space.id), &title, "");
    }
    if let Some(space_type) = extract_json_string(body, "type") {
        space.space_type = space_type;
    }
    if let Some(layout) = extract_json_string(body, "layout_mode") {
        space.layout = layout;
    }
    if let Some(description) = extract_nested_json_string(body, "display_config", "description") {
        space.description = localized_text(
            &format!("atrium.space.{}.description", space.id),
            &description,
            "",
        );
    }
    if let Some(groups) = extract_optional_json_string_array(body, "visibility_groups") {
        space.groups = groups;
    }
    let updated_space = space.clone();
    if let Err(error) = write_preview_space_file(&state.client_root_dir(), &updated_space) {
        return (
            "500 Internal Server Error",
            "application/json; charset=utf-8",
            format!(
                "{{\"error\":\"space_write_failed\",\"message\":{}}}",
                json_string(&error.to_string())
            ),
        );
    }
    state.reload_catalog();
    (
        "200 OK",
        "application/json; charset=utf-8",
        preview_space_json(&updated_space),
    )
}

fn preview_archive_space(state: &mut PreviewState, space_id: &str, archived: bool) -> (&'static str, &'static str, String) {
    let Some(space) = state.catalog.spaces.iter_mut().find(|space| space.id == space_id) else {
        return (
            "404 Not Found",
            "application/json; charset=utf-8",
            "{\"error\":\"space_not_found\"}".to_string(),
        );
    };
    space.state = if archived { "archived" } else { "active" }.to_string();
    let updated_space = space.clone();
    if let Err(error) = write_preview_space_file(&state.client_root_dir(), &updated_space) {
        return (
            "500 Internal Server Error",
            "application/json; charset=utf-8",
            format!(
                "{{\"error\":\"space_write_failed\",\"message\":{}}}",
                json_string(&error.to_string())
            ),
        );
    }
    state.reload_catalog();
    (
        "200 OK",
        "application/json; charset=utf-8",
        preview_space_json(&updated_space),
    )
}

fn preview_delete_space(state: &mut PreviewState, space_id: &str) -> (&'static str, &'static str, String) {
    if let Err(error) = delete_preview_space_files(&state.client_root_dir(), space_id) {
        return (
            "500 Internal Server Error",
            "application/json; charset=utf-8",
            format!(
                "{{\"error\":\"space_delete_failed\",\"message\":{}}}",
                json_string(&error.to_string())
            ),
        );
    }
    let before = state.catalog.spaces.len();
    state.catalog.spaces.retain(|space| space.id != space_id);
    state.directory_items.retain(|item| item.space_id != space_id);
    if state.catalog.spaces.len() == before {
        return (
            "404 Not Found",
            "application/json; charset=utf-8",
            "{\"error\":\"space_not_found\"}".to_string(),
        );
    }
    state.reload_catalog();
    (
        "200 OK",
        "application/json; charset=utf-8",
        format!("{{\"deleted\":true,\"space_id\":{}}}", json_string(space_id)),
    )
}
