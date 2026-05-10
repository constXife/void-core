fn preview_create_directory_item(state: &mut PreviewState, body: &str) -> String {
    let space_id = extract_json_string(body, "space_id").unwrap_or_else(|| "admin".to_string());
    let title = extract_json_string(body, "title").unwrap_or_else(|| "Untitled".to_string());
    let resource_id = preview_next_resource_id(state, &title);
    let item = PreviewDirectoryItem {
        id: format!("{space_id}:{resource_id}"),
        title: localized_text(&format!("atrium.resource.{resource_id}.title"), &title, ""),
        description: localized_text(
            &format!("atrium.resource.{resource_id}.description"),
            &extract_json_string(body, "description").unwrap_or_default(),
            "",
        ),
        resource_id,
        space_id,
        url: extract_json_string(body, "url").unwrap_or_default(),
        item_type: extract_json_string(body, "item_type").unwrap_or_else(|| "resource".to_string()),
        group: extract_json_string(body, "group").unwrap_or_default(),
        pinned: extract_json_bool(body, "pinned").unwrap_or(false),
        order: preview_next_directory_order(state),
    };
    if let Err(error) = write_preview_directory_item_files(&state.client_root_dir(), &item) {
        return format!(
            "{{\"error\":\"directory_item_write_failed\",\"message\":{}}}",
            json_string(&error.to_string())
        );
    }
    state.reload_catalog();
    preview_directory_item_json(
        state
            .directory_items
            .iter()
            .find(|candidate| candidate.id == item.id)
            .unwrap_or(&item),
    )
}

fn preview_patch_directory_item(state: &mut PreviewState, item_id: &str, body: &str) -> (&'static str, &'static str, String) {
    let Some(existing_item) = state.directory_items.iter().find(|item| item.id == item_id).cloned() else {
        return (
            "404 Not Found",
            "application/json; charset=utf-8",
            "{\"error\":\"directory_item_not_found\"}".to_string(),
        );
    };
    let mut item = existing_item;
    if let Some(title) = extract_json_string(body, "title") {
        item.title = localized_text(&format!("atrium.resource.{}.title", item.resource_id), &title, "");
    }
    if let Some(url) = extract_json_string(body, "url") {
        item.url = url;
    }
    if let Some(item_type) = extract_json_string(body, "item_type") {
        item.item_type = item_type;
    }
    if let Some(group) = extract_json_string(body, "group") {
        item.group = group;
    }
    if let Some(pinned) = extract_json_bool(body, "pinned") {
        item.pinned = pinned;
    }
    if let Err(error) = write_preview_directory_item_files(&state.client_root_dir(), &item) {
        return (
            "500 Internal Server Error",
            "application/json; charset=utf-8",
            format!(
                "{{\"error\":\"directory_item_write_failed\",\"message\":{}}}",
                json_string(&error.to_string())
            ),
        );
    }
    state.reload_catalog();
    (
        "200 OK",
        "application/json; charset=utf-8",
        preview_directory_item_json(
            state
                .directory_items
                .iter()
                .find(|candidate| candidate.id == item.id)
                .unwrap_or(&item),
        ),
    )
}

fn preview_delete_directory_item(state: &mut PreviewState, item_id: &str) -> (&'static str, &'static str, String) {
    let Some(item) = state.directory_items.iter().find(|item| item.id == item_id).cloned() else {
        return (
            "404 Not Found",
            "application/json; charset=utf-8",
            "{\"error\":\"directory_item_not_found\"}".to_string(),
        );
    };
    if let Err(error) = delete_preview_directory_item_files(&state.client_root_dir(), &item) {
        return (
            "500 Internal Server Error",
            "application/json; charset=utf-8",
            format!(
                "{{\"error\":\"directory_item_delete_failed\",\"message\":{}}}",
                json_string(&error.to_string())
            ),
        );
    }
    state.reload_catalog();
    (
        "200 OK",
        "application/json; charset=utf-8",
        format!("{{\"deleted\":true,\"item_id\":{}}}", json_string(item_id)),
    )
}

fn preview_next_resource_id(state: &mut PreviewState, title: &str) -> String {
    let base = slugify(title);
    let mut candidate = if base.is_empty() {
        state.next_generated_id("resource")
    } else {
        base
    };
    while state.directory_items.iter().any(|item| item.resource_id == candidate) {
        candidate = format!("{candidate}-{}", state.next_id);
        state.next_id += 1;
    }
    candidate
}

fn preview_next_directory_order(state: &PreviewState) -> i64 {
    state
        .directory_items
        .iter()
        .map(|item| item.order)
        .max()
        .unwrap_or(0)
        + 10
}
