fn load_preview_directory_items(client_root: &Path) -> Vec<PreviewDirectoryItem> {
    let placements_dir = client_root.join("placements");
    let resources_dir = client_root.join("resources");
    let mut items = Vec::new();

    for path in list_yaml_files(&placements_dir) {
        let source = fs::read_to_string(&path).unwrap_or_default();
        let space_id = parse_scalar(&source, "space").unwrap_or_else(|| {
            path.file_stem()
                .and_then(|value| value.to_str())
                .unwrap_or("space")
                .to_string()
        });
        for entry in parse_placement_resources(&source) {
            let resource_path = resources_dir.join(format!("{}.yaml", entry.resource_id));
            let resource_source = fs::read_to_string(&resource_path).unwrap_or_default();
            items.push(PreviewDirectoryItem {
                id: format!("{}:{}", space_id, entry.resource_id),
                resource_id: entry.resource_id.clone(),
                space_id: space_id.clone(),
                title: parse_localized_text(
                    &resource_source,
                    "title",
                    &format!("atrium.resource.{}.title", entry.resource_id),
                ),
                description: parse_localized_text(
                    &resource_source,
                    "description",
                    &format!("atrium.resource.{}.description", entry.resource_id),
                ),
                url: parse_scalar(&resource_source, "url").unwrap_or_default(),
                item_type: parse_scalar(&resource_source, "type")
                    .unwrap_or_else(|| "resource".to_string()),
                pinned: entry.pinned,
                order: entry.order,
            });
        }
    }

    items.sort_by(|left, right| {
        (
            if left.pinned { 0 } else { 1 },
            left.order,
            localized_text_sort_key(&left.title),
            left.id.clone(),
        )
            .cmp(&(
                if right.pinned { 0 } else { 1 },
                right.order,
                localized_text_sort_key(&right.title),
                right.id.clone(),
            ))
    });
    items
}

fn load_preview_spaces(directory: &Path) -> Vec<PreviewSpace> {
    let mut spaces = Vec::new();
    for path in list_yaml_files(directory) {
        let source = fs::read_to_string(&path).unwrap_or_default();
        let fallback_id = path
            .file_stem()
            .and_then(|value| value.to_str())
            .unwrap_or("space")
            .to_string();
        let id = parse_scalar(&source, "id").unwrap_or(fallback_id);
        spaces.push(PreviewSpace {
            title: parse_localized_text(&source, "title", &format!("atrium.space.{id}.title")),
            state: parse_scalar(&source, "state").unwrap_or_else(|| "active".to_string()),
            space_type: parse_scalar(&source, "type").unwrap_or_else(|| "staff".to_string()),
            layout: parse_scalar(&source, "layout").unwrap_or_else(|| "grid".to_string()),
            description: parse_localized_text(
                &source,
                "description",
                &format!("atrium.space.{id}.description"),
            ),
            groups: parse_string_list(&source, "groups"),
            dashboard_template: parse_scalar(&source, "dashboard_template")
                .unwrap_or_else(|| "admin-default".to_string()),
            id,
        });
    }
    spaces.sort_by(|left, right| left.id.cmp(&right.id));
    spaces
}

fn load_preview_templates(directory: &Path) -> BTreeMap<String, PreviewTemplate> {
    let mut templates = BTreeMap::new();
    for path in list_yaml_files(directory) {
        let source = fs::read_to_string(&path).unwrap_or_default();
        let fallback_key = path
            .file_stem()
            .and_then(|value| value.to_str())
            .unwrap_or("template")
            .to_string();
        let key = parse_scalar(&source, "id").unwrap_or(fallback_key);
        let mut blocks = parse_template_blocks(&source);
        if blocks.is_empty() {
            blocks.push(default_preview_block());
        }
        templates.insert(key.clone(), PreviewTemplate { key, blocks });
    }
    templates
}

fn list_yaml_files(directory: &Path) -> Vec<PathBuf> {
    let Ok(entries) = fs::read_dir(directory) else {
        return Vec::new();
    };
    let mut files = entries
        .filter_map(|entry| entry.ok().map(|value| value.path()))
        .filter(|path| {
            matches!(
                path.extension().and_then(|value| value.to_str()),
                Some("yaml" | "yml")
            )
        })
        .collect::<Vec<_>>();
    files.sort();
    files
}

fn preview_current_space<'a>(
    state: &'a PreviewState,
    requested_space_id: Option<&str>,
) -> Option<&'a PreviewSpace> {
    if let Some(space_id) = requested_space_id
        .map(str::trim)
        .filter(|value| !value.is_empty())
    {
        return state.catalog.spaces.iter().find(|space| space.id == space_id);
    }
    state
        .catalog
        .spaces
        .iter()
        .find(|space| !space.state.eq_ignore_ascii_case("archived"))
        .or_else(|| state.catalog.spaces.first())
}

fn preview_template_for_space<'a>(
    state: &'a PreviewState,
    space: &PreviewSpace,
) -> PreviewTemplate {
    state
        .catalog
        .templates
        .get(space.dashboard_template.as_str())
        .cloned()
        .unwrap_or_else(default_preview_template)
}
