fn preview_space_yaml(space: &PreviewSpace) -> String {
    let mut lines = vec![
        format!("id: {}", yaml_string(&space.id)),
        "title:".to_string(),
    ];
    lines.extend(localized_text_yaml_lines(&space.title, 2));
    lines.extend([
        format!("state: {}", yaml_string(&space.state)),
        format!("type: {}", yaml_string(&space.space_type)),
        "description:".to_string(),
    ]);
    lines.extend(localized_text_yaml_lines(&space.description, 2));
    lines.extend([
        format!("layout: {}", yaml_string(&space.layout)),
        "groups:".to_string(),
    ]);
    for group in &space.groups {
        lines.push(format!("  - {}", yaml_string(group)));
    }
    lines.push(format!(
        "dashboard_template: {}",
        yaml_string(&space.dashboard_template)
    ));
    lines.push(String::new());
    lines.join("\n")
}

fn preview_resource_yaml(item: &PreviewDirectoryItem) -> String {
    let mut lines = vec![
        format!("id: {}", yaml_string(&item.resource_id)),
        "title:".to_string(),
    ];
    lines.extend(localized_text_yaml_lines(&item.title, 2));
    lines.extend([
        "description:".to_string(),
    ]);
    lines.extend(localized_text_yaml_lines(&item.description, 2));
    lines.extend([
        format!("url: {}", yaml_string(&item.url)),
        format!("type: {}", yaml_string(&item.item_type)),
        "state: \"active\"".to_string(),
        String::new(),
    ]);
    lines.join("\n")
}

fn preview_placement_yaml(space_id: &str, entries: &[PreviewPlacementEntry]) -> String {
    let mut lines = vec![
        format!("space: {}", yaml_string(space_id)),
        "resources:".to_string(),
    ];
    for entry in entries {
        lines.push(format!("  - resource: {}", yaml_string(&entry.resource_id)));
        lines.push(format!(
            "    pinned: {}",
            if entry.pinned { "true" } else { "false" }
        ));
        lines.push(format!("    order: {}", entry.order));
    }
    lines.push(String::new());
    lines.join("\n")
}

fn preview_template_yaml(template: &PreviewTemplate) -> String {
    let mut lines = vec![format!("id: {}", yaml_string(&template.key)), "blocks:".to_string()];
    for block in &template.blocks {
        lines.push(format!("  - id: {}", yaml_string(&block.id)));
        lines.push(format!("    type: {}", yaml_string(&block.block_type)));
        lines.push("    title:".to_string());
        lines.extend(localized_text_yaml_lines(&block.title, 6));
        lines.push("    config:".to_string());
        lines.push(format!("      limit: {}", block.limit));
    }
    lines.push(String::new());
    lines.join("\n")
}
