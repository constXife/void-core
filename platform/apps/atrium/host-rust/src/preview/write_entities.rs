fn write_preview_space_file(client_root: &Path, space: &PreviewSpace) -> std::io::Result<()> {
    let spaces_dir = client_root.join("spaces");
    fs::create_dir_all(&spaces_dir)?;
    let path = spaces_dir.join(format!("{}.yaml", space.id));
    fs::write(path, preview_space_yaml(space))
}

fn delete_preview_space_files(client_root: &Path, space_id: &str) -> std::io::Result<()> {
    let space_path = client_root.join("spaces").join(format!("{space_id}.yaml"));
    if space_path.exists() {
        fs::remove_file(space_path)?;
    }
    let placement_path = client_root.join("placements").join(format!("{space_id}.yaml"));
    if placement_path.exists() {
        fs::remove_file(placement_path)?;
    }
    Ok(())
}

fn write_preview_directory_item_files(client_root: &Path, item: &PreviewDirectoryItem) -> std::io::Result<()> {
    let resources_dir = client_root.join("resources");
    let placements_dir = client_root.join("placements");
    fs::create_dir_all(&resources_dir)?;
    fs::create_dir_all(&placements_dir)?;

    let resource_path = resources_dir.join(format!("{}.yaml", item.resource_id));
    fs::write(&resource_path, preview_resource_yaml(item))?;

    let placement_path = placements_dir.join(format!("{}.yaml", item.space_id));
    let existing_source = fs::read_to_string(&placement_path).unwrap_or_default();
    let mut entries = parse_placement_resources(&existing_source);
    if let Some(existing) = entries
        .iter_mut()
        .find(|entry| entry.resource_id == item.resource_id)
    {
        existing.pinned = item.pinned;
        existing.order = item.order;
    } else {
        entries.push(PreviewPlacementEntry {
            resource_id: item.resource_id.clone(),
            pinned: item.pinned,
            order: item.order,
        });
    }
    entries.sort_by(|left, right| (left.order, &left.resource_id).cmp(&(right.order, &right.resource_id)));
    fs::write(&placement_path, preview_placement_yaml(&item.space_id, &entries))?;
    Ok(())
}

fn delete_preview_directory_item_files(client_root: &Path, item: &PreviewDirectoryItem) -> std::io::Result<()> {
    let resource_path = client_root
        .join("resources")
        .join(format!("{}.yaml", item.resource_id));
    if resource_path.exists() {
        fs::remove_file(resource_path)?;
    }

    let placement_path = client_root
        .join("placements")
        .join(format!("{}.yaml", item.space_id));
    let source = fs::read_to_string(&placement_path).unwrap_or_default();
    let mut entries = parse_placement_resources(&source);
    entries.retain(|entry| entry.resource_id != item.resource_id);
    if entries.is_empty() {
        if placement_path.exists() {
            fs::remove_file(placement_path)?;
        }
    } else {
        fs::write(&placement_path, preview_placement_yaml(&item.space_id, &entries))?;
    }
    Ok(())
}

fn write_preview_template_file(client_root: &Path, template: &PreviewTemplate) -> std::io::Result<()> {
    let templates_dir = client_root.join("templates");
    fs::create_dir_all(&templates_dir)?;
    let path = templates_dir.join(format!("{}.yaml", template.key));
    fs::write(path, preview_template_yaml(template))
}
